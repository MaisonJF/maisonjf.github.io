#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import secrets
import sqlite3
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Optional


class CollectorError(Exception):
    code = "collector_error"
    retryable = False

    def __init__(self, message: str, *, details: Optional[dict[str, Any]] = None):
        super().__init__(message)
        self.details = details or {}


class ValidationError(CollectorError):
    code = "validation_error"


class PrivacyViolation(CollectorError):
    code = "privacy_violation"


class UnsupportedContractVersion(CollectorError):
    code = "unsupported_contract_version"


class UnknownSource(CollectorError):
    code = "unknown_source"


class IdempotencyConflict(CollectorError):
    code = "idempotency_conflict"


class TransientStorageError(CollectorError):
    code = "transient_storage_error"
    retryable = True


@dataclass(frozen=True)
class IngestResult:
    status: str
    event_id: str
    payload_hash: str
    duplicate: bool


@dataclass(frozen=True)
class FailurePlan:
    action: str
    retryable: bool
    next_delay_seconds: Optional[int]
    dead_letter_mode: Optional[str]
    sanitized_failure: dict[str, Any]


ROOT = Path(__file__).resolve().parent
DEFAULT_SOURCE_REGISTRY = ROOT / "source-registry.json"
DEFAULT_RETRY_POLICY = ROOT / "retry-policy.json"

EVENT_TYPE_RE = re.compile(r"^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")
TOKEN_RE = re.compile(r"^[A-Za-z0-9._:/@+-]{1,200}$")
HOST_RE = re.compile(r"^(?=.{1,255}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")
COUNTRY_RE = re.compile(r"^[A-Z]{2}$")
EMAIL_RE = re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")
IBAN_RE = re.compile(r"(?i)\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
CARDISH_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")

FORBIDDEN_KEYS = {
    "email", "e_mail", "customer_email", "billing_email",
    "phone", "phone_number", "telephone", "mobile",
    "name", "full_name", "first_name", "last_name", "customer_name",
    "address", "street_address", "postal_address", "shipping_address",
    "postal_code", "zip", "zip_code",
    "nif", "vat_number", "tax_id", "iban", "bic", "swift",
    "card_number", "cardholder_name", "billing_details", "shipping_details",
    "stripe_customer_id", "customer_id",
    "oracle_response", "oracle_answer", "oracle_content",
    "reading_text", "paid_oracle_text", "response_text", "answer_text",
    "raw_query", "query_text", "free_text", "message", "notes",
}
FORBIDDEN_KEY_FRAGMENTS = (
    "oracle_response", "oracle_answer", "paid_oracle", "reading_text",
    "billing_details", "shipping_details",
)

ID_PREFIXES = {
    "journey_id": "jrn_",
    "asset_id": "ast_",
    "need_id": "ned_",
    "solution_id": "sol_",
    "rule_version_id": "rul_",
    "model_version_id": "mdl_",
}


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _uuid7() -> uuid.UUID:
    ms = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    value = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return uuid.UUID(int=value)


def new_event_id() -> str:
    return f"evt_{_uuid7()}"


def _validate_prefixed_uuid7(value: Any, prefix: str, field: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str) or not value.startswith(prefix) or len(value) != 40:
        raise ValidationError(f"{field} must be {prefix}<UUIDv7>")
    try:
        parsed = uuid.UUID(value[len(prefix):])
    except ValueError as exc:
        raise ValidationError(f"{field} is not a valid UUID") from exc
    if parsed.version != 7 or parsed.variant != uuid.RFC_4122:
        raise ValidationError(f"{field} must contain an RFC 4122 UUIDv7")
    return value


def _normalize_timestamp(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError("occurred_at must be a non-empty RFC3339 timestamp")
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError("occurred_at is not a valid ISO-8601 timestamp") from exc
    if dt.tzinfo is None:
        raise ValidationError("occurred_at must include a timezone")
    dt = dt.astimezone(timezone.utc)
    return dt.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _contains_direct_pii_string(value: str) -> bool:
    if EMAIL_RE.search(value) or IBAN_RE.search(value):
        return True
    if CARDISH_RE.search(value):
        digits = re.sub(r"\D", "", value)
        if 13 <= len(digits) <= 19:
            return True
    return False


def _privacy_scan(value: Any, *, path: str = "$") -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            if not isinstance(key, str):
                raise PrivacyViolation(f"{path}: metadata keys must be strings")
            k = key.strip().lower()
            if k in FORBIDDEN_KEYS or any(fragment in k for fragment in FORBIDDEN_KEY_FRAGMENTS):
                raise PrivacyViolation(f"{path}.{key}: forbidden direct-PII or paid-content field")
            _privacy_scan(child, path=f"{path}.{key}")
    elif isinstance(value, list):
        for i, child in enumerate(value):
            _privacy_scan(child, path=f"{path}[{i}]")
    elif isinstance(value, str):
        if _contains_direct_pii_string(value):
            raise PrivacyViolation(f"{path}: value appears to contain direct PII")


def _normalize_public_path(value: Any, field: str, max_length: int) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be a string")
    v = value.strip()
    if "://" in v:
        raise ValidationError(f"{field} must be a path, not an absolute URL")
    v = v.split("?", 1)[0].split("#", 1)[0]
    if not v.startswith("/"):
        raise ValidationError(f"{field} must start with /")
    if len(v) > max_length:
        raise ValidationError(f"{field} exceeds max length")
    return v


def _normalize_metadata_value(value: Any, spec: Mapping[str, Any], field: str) -> Any:
    kind = spec["type"]
    if kind == "boolean":
        if not isinstance(value, bool):
            raise ValidationError(f"{field} must be boolean")
        return value
    if kind == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValidationError(f"{field} must be integer")
        minimum = spec.get("minimum")
        if minimum is not None and value < minimum:
            raise ValidationError(f"{field} must be >= {minimum}")
        return value
    if kind == "sha256":
        if not isinstance(value, str):
            raise ValidationError(f"{field} must be a SHA-256 string")
        v = value.strip().lower()
        if not HEX64_RE.fullmatch(v):
            raise ValidationError(f"{field} must be 64 lowercase hex characters")
        return v
    if kind == "country_code":
        if not isinstance(value, str):
            raise ValidationError(f"{field} must be a country code")
        v = value.strip().upper()
        if not COUNTRY_RE.fullmatch(v):
            raise ValidationError(f"{field} must be ISO-like two-letter uppercase code")
        return v
    if kind == "hostname":
        if not isinstance(value, str):
            raise ValidationError(f"{field} must be a hostname")
        v = value.strip().lower().rstrip(".")
        if not HOST_RE.fullmatch(v):
            raise ValidationError(f"{field} is not a valid hostname")
        return v
    if kind == "public_path":
        return _normalize_public_path(value, field, int(spec.get("maxLength", 500)))
    if kind == "token":
        if not isinstance(value, str):
            raise ValidationError(f"{field} must be a token")
        v = value.strip()
        max_length = int(spec.get("maxLength", 200))
        if not (1 <= len(v) <= max_length) or not TOKEN_RE.fullmatch(v):
            raise ValidationError(f"{field} contains unsupported characters or length")
        if _contains_direct_pii_string(v):
            raise PrivacyViolation(f"{field} appears to contain direct PII")
        return v
    raise ValidationError(f"{field}: unsupported registry type {kind!r}")


def normalize_ingestion(raw: Mapping[str, Any], *, source_registry: Optional[Mapping[str, Any]] = None) -> dict[str, Any]:
    if not isinstance(raw, Mapping):
        raise ValidationError("event must be an object")

    allowed_top = {
        "contract_version", "source", "event_type", "occurred_at", "idempotency_key",
        "journey_id", "asset_id", "need_id", "solution_id",
        "value_minor", "currency", "privacy_class", "metadata",
        "rule_version_id", "model_version_id",
    }
    unknown = sorted(set(raw.keys()) - allowed_top)
    if unknown:
        raise ValidationError(f"unknown top-level fields: {', '.join(unknown)}")

    if raw.get("contract_version") != 1:
        raise UnsupportedContractVersion("only ingestion contract_version 1 is supported")

    source_raw = raw.get("source")
    if not isinstance(source_raw, str) or not source_raw.strip():
        raise ValidationError("source is required")
    source = source_raw.strip().lower()
    if len(source) > 80:
        raise ValidationError("source exceeds 80 characters")

    registry = dict(source_registry or _load_json(DEFAULT_SOURCE_REGISTRY))
    if registry.get("default") != "deny":
        raise ValidationError("source registry must be deny-by-default")
    source_spec = registry.get("sources", {}).get(source)
    if source_spec is None:
        raise UnknownSource(f"source {source!r} is not allowlisted")

    event_type_raw = raw.get("event_type")
    if not isinstance(event_type_raw, str):
        raise ValidationError("event_type is required")
    event_type = event_type_raw.strip().lower()
    if not EVENT_TYPE_RE.fullmatch(event_type):
        raise ValidationError("event_type must be lowercase dotted identifiers")
    prefixes = tuple(source_spec.get("allowed_event_prefixes", ()))
    if not prefixes or not event_type.startswith(prefixes):
        raise ValidationError(f"event_type {event_type!r} is not allowed for source {source!r}")
    event_specs = source_spec.get("events")
    event_spec = None
    if isinstance(event_specs, Mapping):
        event_spec = event_specs.get(event_type)
        if event_spec is None:
            raise ValidationError(f"event_type {event_type!r} is not declared for source {source!r}")

    idempotency_key_raw = raw.get("idempotency_key")
    if not isinstance(idempotency_key_raw, str):
        raise ValidationError("idempotency_key is required")
    idempotency_key = idempotency_key_raw.strip()
    if not (8 <= len(idempotency_key) <= 200):
        raise ValidationError("idempotency_key length must be 8..200")
    if _contains_direct_pii_string(idempotency_key):
        raise PrivacyViolation("idempotency_key must not contain direct PII")

    privacy_class = raw.get("privacy_class", "pseudonymous")
    if privacy_class not in {"anonymous", "pseudonymous", "aggregated", "system"}:
        raise ValidationError("invalid privacy_class")
    if privacy_class not in source_spec.get("privacy_class", []):
        raise ValidationError(f"privacy_class {privacy_class!r} is not allowed for source {source!r}")

    occurred_at = _normalize_timestamp(raw.get("occurred_at"))

    metadata_raw = raw.get("metadata", {})
    if not isinstance(metadata_raw, Mapping):
        raise ValidationError("metadata must be an object")
    _privacy_scan(metadata_raw)
    allowed_metadata = source_spec.get("metadata", {})
    unknown_meta = sorted(set(metadata_raw.keys()) - set(allowed_metadata.keys()))
    if unknown_meta:
        raise ValidationError(
            f"metadata fields not allowlisted for source {source!r}: {', '.join(unknown_meta)}"
        )
    if isinstance(event_spec, Mapping):
        event_allowed = set(event_spec.get("allowed_metadata", allowed_metadata.keys()))
        event_unknown = sorted(set(metadata_raw.keys()) - event_allowed)
        if event_unknown:
            raise ValidationError(
                f"metadata fields not allowed for event_type {event_type!r}: {', '.join(event_unknown)}"
            )
        required_meta = tuple(event_spec.get("required_metadata", ()))
        missing_meta = [key for key in required_meta if key not in metadata_raw]
        if missing_meta:
            raise ValidationError(
                f"missing required metadata for event_type {event_type!r}: {', '.join(missing_meta)}"
            )
    metadata: dict[str, Any] = {}
    for key in sorted(metadata_raw.keys()):
        metadata[key] = _normalize_metadata_value(
            metadata_raw[key], allowed_metadata[key], f"metadata.{key}"
        )
    _privacy_scan(metadata)

    ids = {}
    for field, prefix in ID_PREFIXES.items():
        ids[field] = _validate_prefixed_uuid7(raw.get(field), prefix, field)

    value_minor = raw.get("value_minor")
    currency = raw.get("currency")
    if value_minor is None:
        if currency is not None:
            raise ValidationError("currency is only allowed when value_minor is present")
        normalized_currency = None
    else:
        if isinstance(value_minor, bool) or not isinstance(value_minor, int):
            raise ValidationError("value_minor must be an integer")
        if not isinstance(currency, str):
            raise ValidationError("currency is required when value_minor is present")
        normalized_currency = currency.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}", normalized_currency):
            raise ValidationError("currency must be a three-letter uppercase code after normalization")

    normalized = {
        "contract_version": 1,
        "source": source,
        "event_type": event_type,
        "occurred_at": occurred_at,
        "idempotency_key": idempotency_key,
        "schema_version": 2,
        "privacy_class": privacy_class,
        "metadata": metadata,
        "journey_id": ids["journey_id"],
        "asset_id": ids["asset_id"],
        "need_id": ids["need_id"],
        "solution_id": ids["solution_id"],
        "value_minor": value_minor,
        "currency": normalized_currency,
        "rule_version_id": ids["rule_version_id"],
        "model_version_id": ids["model_version_id"],
    }
    _privacy_scan(normalized)
    return normalized


def to_a1_event(normalized: Mapping[str, Any]) -> dict[str, Any]:
    canonical_for_hash = dict(normalized)
    canonical_for_hash.pop("contract_version", None)
    payload_hash = _sha256_text(_canonical_json(canonical_for_hash))
    return {
        "event_id": new_event_id(),
        "idempotency_key": normalized["idempotency_key"],
        "event_type": normalized["event_type"],
        "source": normalized["source"],
        "schema_version": 2,
        "occurred_at": normalized["occurred_at"],
        "journey_id": normalized.get("journey_id"),
        "asset_id": normalized.get("asset_id"),
        "need_id": normalized.get("need_id"),
        "solution_id": normalized.get("solution_id"),
        "value_minor": normalized.get("value_minor"),
        "currency": normalized.get("currency"),
        "privacy_class": normalized["privacy_class"],
        "payload_hash": payload_hash,
        "metadata_json": _canonical_json(normalized.get("metadata", {})),
        "rule_version_id": normalized.get("rule_version_id"),
        "model_version_id": normalized.get("model_version_id"),
    }


class MemoryEventStore:
    def __init__(self):
        self._by_key: dict[tuple[str, str], dict[str, Any]] = {}

    def persist(self, event: Mapping[str, Any]) -> IngestResult:
        key = (event["source"], event["idempotency_key"])
        existing = self._by_key.get(key)
        if existing:
            if existing["payload_hash"] != event["payload_hash"]:
                raise IdempotencyConflict("same source/idempotency_key was used with different payload")
            return IngestResult("duplicate", existing["event_id"], existing["payload_hash"], True)
        self._by_key[key] = dict(event)
        return IngestResult("accepted", event["event_id"], event["payload_hash"], False)


class SQLiteA1EventStore:
    """Local/D1-compatible adapter. A Cloudflare adapter can implement the same persist() port."""

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def persist(self, event: Mapping[str, Any]) -> IngestResult:
        source = str(event["source"])
        key = str(event["idempotency_key"])
        try:
            existing = self.connection.execute(
                "SELECT event_id, payload_hash FROM events WHERE source=? AND idempotency_key=?",
                (source, key),
            ).fetchone()
            if existing:
                if existing[1] != event["payload_hash"]:
                    raise IdempotencyConflict("same source/idempotency_key was used with different payload")
                return IngestResult("duplicate", existing[0], existing[1], True)

            scope = f"events:{source}"
            registry = self.connection.execute(
                "SELECT object_id, payload_hash FROM idempotency_registry WHERE scope=? AND idempotency_key=?",
                (scope, key),
            ).fetchone()
            if registry:
                if registry[1] != event["payload_hash"]:
                    raise IdempotencyConflict("idempotency registry contains a conflicting payload")
                existing2 = self.connection.execute(
                    "SELECT event_id, payload_hash FROM events WHERE event_id=?",
                    (registry[0],),
                ).fetchone()
                if existing2:
                    return IngestResult("duplicate", existing2[0], existing2[1], True)
                raise TransientStorageError("idempotency registry points to missing event")

            self.connection.execute("BEGIN")
            try:
                self.connection.execute(
                    """INSERT INTO events
                    (event_id,idempotency_key,event_type,source,schema_version,occurred_at,
                     journey_id,asset_id,need_id,solution_id,value_minor,currency,privacy_class,
                     payload_hash,metadata_json,rule_version_id,model_version_id)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        event["event_id"], event["idempotency_key"], event["event_type"],
                        event["source"], event["schema_version"], event["occurred_at"],
                        event.get("journey_id"), event.get("asset_id"), event.get("need_id"),
                        event.get("solution_id"), event.get("value_minor"), event.get("currency"),
                        event["privacy_class"], event["payload_hash"], event["metadata_json"],
                        event.get("rule_version_id"), event.get("model_version_id"),
                    ),
                )
                self.connection.execute(
                    """INSERT INTO idempotency_registry
                    (scope,idempotency_key,object_type,object_id,payload_hash)
                    VALUES (?,?,?,?,?)""",
                    (scope, key, "event", event["event_id"], event["payload_hash"]),
                )
                self.connection.commit()
            except Exception:
                self.connection.rollback()
                raise
            return IngestResult("accepted", event["event_id"], event["payload_hash"], False)
        except IdempotencyConflict:
            raise
        except sqlite3.IntegrityError:
            self.connection.rollback()
            existing = self.connection.execute(
                "SELECT event_id, payload_hash FROM events WHERE source=? AND idempotency_key=?",
                (source, key),
            ).fetchone()
            if existing and existing[1] == event["payload_hash"]:
                return IngestResult("duplicate", existing[0], existing[1], True)
            if existing:
                raise IdempotencyConflict("concurrent insert produced idempotency conflict")
            raise
        except sqlite3.OperationalError as exc:
            self.connection.rollback()
            raise TransientStorageError(str(exc)) from exc


class EventCollector:
    def __init__(self, store: Any, *, source_registry: Optional[Mapping[str, Any]] = None):
        self.store = store
        self.source_registry = dict(source_registry or _load_json(DEFAULT_SOURCE_REGISTRY))

    def ingest(self, raw: Mapping[str, Any]) -> IngestResult:
        normalized = normalize_ingestion(raw, source_registry=self.source_registry)
        event = to_a1_event(normalized)
        return self.store.persist(event)


def sanitized_failure_record(raw: Any, error: CollectorError, *, attempt: int = 0) -> dict[str, Any]:
    try:
        fingerprint_source = _canonical_json(raw)
    except Exception:
        fingerprint_source = repr(type(raw))
    source = None
    event_type = None
    if isinstance(raw, Mapping):
        raw_source = raw.get("source")
        raw_type = raw.get("event_type")
        if isinstance(raw_source, str) and not _contains_direct_pii_string(raw_source):
            source = raw_source.strip().lower()[:80]
        if isinstance(raw_type, str) and not _contains_direct_pii_string(raw_type):
            event_type = raw_type.strip().lower()[:160]
    return {
        "error_code": error.code,
        "retryable": bool(error.retryable),
        "attempt": int(attempt),
        "source": source,
        "event_type": event_type,
        "payload_fingerprint": _sha256_text(fingerprint_source),
        "raw_payload_persisted": False,
    }


def failure_plan(
    raw: Any,
    error: CollectorError,
    *,
    attempt: int,
    retry_policy: Optional[Mapping[str, Any]] = None,
) -> FailurePlan:
    policy = dict(retry_policy or _load_json(DEFAULT_RETRY_POLICY))
    spec = policy.get("categories", {}).get(error.code)
    if spec is None:
        spec = {"retry": False, "dead_letter": "sanitized_fingerprint_only"}

    sanitized = sanitized_failure_record(raw, error, attempt=attempt)
    if not spec.get("retry", False):
        return FailurePlan(
            action="reject",
            retryable=False,
            next_delay_seconds=None,
            dead_letter_mode=spec.get("dead_letter", "sanitized_fingerprint_only"),
            sanitized_failure=sanitized,
        )

    delays = list(spec.get("delays_seconds", []))
    max_attempts = int(spec.get("max_attempts", len(delays)))
    if attempt < max_attempts and attempt < len(delays):
        return FailurePlan(
            action="retry",
            retryable=True,
            next_delay_seconds=int(delays[attempt]),
            dead_letter_mode=None,
            sanitized_failure=sanitized,
        )
    return FailurePlan(
        action="dead_letter",
        retryable=False,
        next_delay_seconds=None,
        dead_letter_mode=spec.get("after_exhaustion", "dead_letter_validated_event"),
        sanitized_failure=sanitized,
    )
