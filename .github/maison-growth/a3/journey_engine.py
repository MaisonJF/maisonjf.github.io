#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import secrets
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Optional
from pathlib import Path


ALGORITHM_VERSION = "journey-attribution-v1"
ECONOMICS_CALCULATION_VERSION = "economics-v1"

_CONVERSION_CONTRACT=json.loads(
    (Path(__file__).resolve().parent/"conversion-event-types.json").read_text(encoding="utf-8")
)
CONVERSION_EVENT_TYPES=dict(_CONVERSION_CONTRACT["event_types"])

SOLUTION_TYPES = {
    "oracle",
    "physical_product",
    "service",
    "ebook",
    "b2b",
    "company",
    "digital_collection",
    "future_product",
}
DELIVERY_MODES = {"automatic", "human", "mixed", "external_fulfilment"}
CAPACITY_CLASSES = {"scalable", "human_limited", "inventory_limited", "negotiated", "unknown"}
REPEATABILITY_CLASSES = {"none", "low", "medium", "high", "recurring", "unknown"}
CONFIDENCE_CLASSES = {"low", "medium", "high", "observed"}


class A3Error(Exception):
    pass


class A3ValidationError(A3Error):
    pass


class DuplicateConflict(A3Error):
    pass


class EconomicsError(A3Error):
    pass


@dataclass(frozen=True)
class Touch:
    event_id: str
    role: str
    ordinal: int


@dataclass(frozen=True)
class Conversion:
    conversion_id: str
    source_event_id: str
    journey_id: Optional[str]
    solution_id: str
    kind: str
    occurred_at: str
    revenue_minor: Optional[int]
    currency: Optional[str]
    touches: tuple[Touch, ...]


@dataclass(frozen=True)
class JourneySnapshot:
    journey_snapshot_id: str
    journey_id: str
    first_event_id: str
    last_event_id: str
    first_occurred_at: str
    last_occurred_at: str
    event_ids: tuple[str, ...]
    touch_count: int
    conversion_count: int
    out_of_order_detected: bool
    completeness: str
    confidence_class: str
    event_set_hash: str


@dataclass(frozen=True)
class UnresolvedEvent:
    event_id: str
    reason_code: str
    fingerprint: str


@dataclass(frozen=True)
class BuildResult:
    rebuild_run_id: str
    input_event_set_hash: str
    unique_event_count: int
    duplicate_count: int
    unresolved: tuple[UnresolvedEvent, ...]
    journeys: tuple[JourneySnapshot, ...]
    conversions: tuple[Conversion, ...]


@dataclass(frozen=True)
class EconomicAssessment:
    economic_assessment_id: str
    conversion_id: str
    economics_version_id: str
    revenue_minor: int
    variable_cost_minor: int
    human_effort_minutes: int
    human_effort_cost_minor: int
    immediate_contribution_minor: int
    continuation_expected_value_minor: Optional[int]
    expected_total_value_minor: Optional[int]
    scalability_score: int
    repeatability_class: str
    confidence_class: str
    calculation_version: str
    input_hash: str


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256(value: Any) -> str:
    text = value if isinstance(value, str) else _canonical_json(value)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _uuid7() -> uuid.UUID:
    ms = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    value = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return uuid.UUID(int=value)


def _new_id(prefix: str) -> str:
    return f"{prefix}{_uuid7()}"


def new_journey_id() -> str:
    """Create a stable opaque journey identifier. Never derive it from PII."""
    return _new_id("jrn_")


def _validate_prefixed_uuid(value: Optional[str], prefix: str, field: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str) or len(value) != 40 or not value.startswith(prefix):
        raise A3ValidationError(f"{field} must be {prefix}<UUIDv7>")
    try:
        parsed = uuid.UUID(value[4:])
    except ValueError as exc:
        raise A3ValidationError(f"{field} must contain a UUID") from exc
    if parsed.version != 7 or parsed.variant != uuid.RFC_4122:
        raise A3ValidationError(f"{field} must contain RFC 4122 UUIDv7")
    return value


def _parse_time(value: Any) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise A3ValidationError("occurred_at is required")
    raw = value.strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise A3ValidationError("occurred_at must be ISO-8601") from exc
    if dt.tzinfo is None:
        raise A3ValidationError("occurred_at must include timezone")
    return dt.astimezone(timezone.utc)


def _normalized_time(value: str) -> str:
    return _parse_time(value).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _event_fingerprint(event: Mapping[str, Any]) -> str:
    allowed = {
        "event_id": event.get("event_id"),
        "source": event.get("source"),
        "idempotency_key": event.get("idempotency_key"),
        "event_type": event.get("event_type"),
        "occurred_at": event.get("occurred_at"),
        "journey_id": event.get("journey_id"),
        "asset_id": event.get("asset_id"),
        "need_id": event.get("need_id"),
        "solution_id": event.get("solution_id"),
        "value_minor": event.get("value_minor"),
        "currency": event.get("currency"),
        "privacy_class": event.get("privacy_class"),
        "payload_hash": event.get("payload_hash"),
        "metadata_json": event.get("metadata_json", "{}"),
    }
    return _sha256(allowed)


def _validate_a2_event(event: Mapping[str, Any]) -> None:
    if not isinstance(event, Mapping):
        raise A3ValidationError("events must be mappings")
    allowed = {
        "event_id", "idempotency_key", "event_type", "source", "schema_version",
        "occurred_at", "received_at", "journey_id", "asset_id", "need_id",
        "solution_id", "value_minor", "currency", "privacy_class", "payload_hash",
        "metadata_json", "rule_version_id", "model_version_id",
    }
    unknown = set(event) - allowed
    if unknown:
        raise A3ValidationError(f"A3 input contains unknown/prohibited fields: {', '.join(sorted(unknown))}")
    _validate_prefixed_uuid(event.get("event_id"), "evt_", "event_id")
    if event.get("schema_version") != 2:
        raise A3ValidationError("A3 accepts A2-normalized/A1 schema_version 2 only")
    if not isinstance(event.get("event_type"), str) or "." not in event["event_type"]:
        raise A3ValidationError("invalid event_type")
    _parse_time(event.get("occurred_at"))
    _validate_prefixed_uuid(event.get("journey_id"), "jrn_", "journey_id")
    _validate_prefixed_uuid(event.get("solution_id"), "sol_", "solution_id")
    if event.get("privacy_class") not in {"anonymous", "pseudonymous", "aggregated", "system"}:
        raise A3ValidationError("invalid privacy_class")
    metadata_json = event.get("metadata_json", "{}")
    if not isinstance(metadata_json, str):
        raise A3ValidationError("metadata_json must be JSON text")
    try:
        metadata = json.loads(metadata_json)
    except json.JSONDecodeError as exc:
        raise A3ValidationError("metadata_json must contain valid JSON") from exc
    if not isinstance(metadata, dict):
        raise A3ValidationError("metadata_json must contain an object")
    forbidden = {
        "email", "name", "phone", "address", "customer_id", "stripe_customer_id",
        "oracle_response", "oracle_answer", "reading_text", "paid_oracle_text",
    }
    if any(key.lower() in forbidden for key in metadata):
        raise A3ValidationError("A3 metadata contains prohibited commercial identity or paid content")


def _dedupe_events(events: Iterable[Mapping[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    by_id: dict[str, dict[str, Any]] = {}
    duplicates = 0
    for raw in events:
        _validate_a2_event(raw)
        event = dict(raw)
        event["occurred_at"] = _normalized_time(event["occurred_at"])
        eid = event["event_id"]
        existing = by_id.get(eid)
        if existing is None:
            by_id[eid] = event
            continue
        if _event_fingerprint(existing) != _event_fingerprint(event):
            raise DuplicateConflict(f"event_id {eid} appeared with conflicting payload")
        duplicates += 1
    return list(by_id.values()), duplicates


def _is_conversion(event: Mapping[str, Any]) -> bool:
    return event["event_type"] in CONVERSION_EVENT_TYPES


def _event_sort_key(event: Mapping[str, Any]) -> tuple[datetime, str]:
    return (_parse_time(event["occurred_at"]), str(event["event_id"]))


def _conversion_id(event: Mapping[str, Any]) -> str:
    # Conversion identity is the immutable source A1 event, not rebuild time.
    return "cnv_"+_sha256({"source_event_id":event["event_id"]})[:36]


def _attribute_touches(prior_events: list[Mapping[str, Any]]) -> tuple[Touch, ...]:
    touches = [e for e in prior_events if not _is_conversion(e)]
    if not touches:
        return ()
    if len(touches) == 1:
        return (Touch(touches[0]["event_id"], "first_last", 1),)
    result: list[Touch] = []
    for i, event in enumerate(touches, start=1):
        if i == 1:
            role = "first"
        elif i == len(touches):
            role = "last"
        else:
            role = "assisted"
        result.append(Touch(event["event_id"], role, i))
    return tuple(result)


def build_journeys(events: Iterable[Mapping[str, Any]]) -> BuildResult:
    """Deterministic reconstruction over immutable A2/A1 events.

    Missing journey_id is never inferred from identity, email, payment data or similarity.
    Such events remain unresolved. Late/out-of-order events are handled by sorting on
    (occurred_at, event_id); a later rebuild produces a new immutable snapshot.
    """
    raw_list = list(events)
    unique, duplicate_count = _dedupe_events(raw_list)
    input_hash = _sha256(sorted((_event_fingerprint(e) for e in unique)))
    rebuild_run_id = _new_id("jrb_")

    groups: dict[str, list[dict[str, Any]]] = {}
    unresolved: list[UnresolvedEvent] = []
    for event in unique:
        journey_id = event.get("journey_id")
        if not journey_id:
            unresolved.append(
                UnresolvedEvent(event["event_id"], "missing_journey_id", _event_fingerprint(event))
            )
            continue
        groups.setdefault(journey_id, []).append(event)

    snapshots: list[JourneySnapshot] = []
    conversions: list[Conversion] = []

    for journey_id in sorted(groups):
        original = groups[journey_id]
        ordered = sorted(original, key=_event_sort_key)
        out_of_order = [e["event_id"] for e in original] != [e["event_id"] for e in ordered]

        conversion_events = [e for e in ordered if _is_conversion(e)]
        touch_events = [e for e in ordered if not _is_conversion(e)]
        completeness = "complete"
        confidence = "high"
        if conversion_events and not touch_events:
            completeness = "conversion_only"
            confidence = "low"
        elif not touch_events or not conversion_events:
            completeness = "partial"
            confidence = "medium"

        event_set_hash = _sha256([_event_fingerprint(e) for e in ordered])
        snapshots.append(
            JourneySnapshot(
                journey_snapshot_id=_new_id("jns_"),
                journey_id=journey_id,
                first_event_id=ordered[0]["event_id"],
                last_event_id=ordered[-1]["event_id"],
                first_occurred_at=ordered[0]["occurred_at"],
                last_occurred_at=ordered[-1]["occurred_at"],
                event_ids=tuple(e["event_id"] for e in ordered),
                touch_count=len(touch_events),
                conversion_count=len(conversion_events),
                out_of_order_detected=out_of_order,
                completeness=completeness,
                confidence_class=confidence,
                event_set_hash=event_set_hash,
            )
        )

        for idx, event in enumerate(ordered):
            if not _is_conversion(event):
                continue
            solution_id = event.get("solution_id")
            if not solution_id:
                raise A3ValidationError(
                    f"conversion event {event['event_id']} requires solution_id"
                )
            value_minor = event.get("value_minor")
            currency = event.get("currency")
            if (value_minor is None) != (currency is None):
                raise A3ValidationError("conversion revenue and currency must be paired")
            prior = ordered[:idx]
            conversions.append(
                Conversion(
                    conversion_id=_conversion_id(event),
                    source_event_id=event["event_id"],
                    journey_id=journey_id,
                    solution_id=solution_id,
                    kind=CONVERSION_EVENT_TYPES[event["event_type"]],
                    occurred_at=event["occurred_at"],
                    revenue_minor=value_minor,
                    currency=currency,
                    touches=_attribute_touches(prior),
                )
            )

    unresolved_ids = {u.event_id for u in unresolved}
    for event in sorted(unique, key=_event_sort_key):
        if event["event_id"] not in unresolved_ids or not _is_conversion(event):
            continue
        solution_id = event.get("solution_id")
        if not solution_id:
            raise A3ValidationError(
                f"conversion event {event['event_id']} requires solution_id"
            )
        conversions.append(
            Conversion(
                conversion_id=_conversion_id(event),
                source_event_id=event["event_id"],
                journey_id=None,
                solution_id=solution_id,
                kind=CONVERSION_EVENT_TYPES[event["event_type"]],
                occurred_at=event["occurred_at"],
                revenue_minor=event.get("value_minor"),
                currency=event.get("currency"),
                touches=(),
            )
        )

    return BuildResult(
        rebuild_run_id=rebuild_run_id,
        input_event_set_hash=input_hash,
        unique_event_count=len(unique),
        duplicate_count=duplicate_count,
        unresolved=tuple(sorted(unresolved, key=lambda x: x.event_id)),
        journeys=tuple(snapshots),
        conversions=tuple(sorted(conversions, key=lambda c: (c.occurred_at, c.source_event_id))),
    )


def validate_solution(solution: Mapping[str, Any]) -> dict[str, Any]:
    solution_id = _validate_prefixed_uuid(solution.get("solution_id"), "sol_", "solution_id")
    key = solution.get("solution_key")
    if not isinstance(key, str) or not key.strip() or key.strip() != key.strip().lower():
        raise A3ValidationError("solution_key must be non-empty lowercase")
    stype = solution.get("solution_type")
    if stype not in SOLUTION_TYPES:
        raise A3ValidationError("unsupported solution_type")
    delivery = solution.get("delivery_mode")
    if delivery not in DELIVERY_MODES:
        raise A3ValidationError("unsupported delivery_mode")
    capacity = solution.get("capacity_class")
    if capacity not in CAPACITY_CLASSES:
        raise A3ValidationError("unsupported capacity_class")
    return {
        "solution_id": solution_id,
        "solution_key": key.strip(),
        "solution_type": stype,
        "delivery_mode": delivery,
        "capacity_class": capacity,
        "status": solution.get("status", "planned"),
    }


def validate_economics_profile(profile: Mapping[str, Any]) -> dict[str, Any]:
    economics_version_id = _validate_prefixed_uuid(
        profile.get("economics_version_id"), "eco_", "economics_version_id"
    )
    solution_id = _validate_prefixed_uuid(profile.get("solution_id"), "sol_", "solution_id")
    currency = profile.get("currency")
    if not isinstance(currency, str) or len(currency) != 3 or currency != currency.upper():
        raise EconomicsError("currency must be ISO-like uppercase 3-letter code")
    ints_nonnegative = (
        "variable_cost_minor", "human_effort_minutes",
        "human_effort_cost_minor", "scalability_score",
    )
    out = dict(profile)
    for field in ints_nonnegative:
        value = out.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise EconomicsError(f"{field} must be a non-negative integer")
    if out["scalability_score"] > 100:
        raise EconomicsError("scalability_score must be <= 100")
    if out.get("repeatability_class", "unknown") not in REPEATABILITY_CLASSES:
        raise EconomicsError("invalid repeatability_class")
    if out.get("confidence_class") not in CONFIDENCE_CLASSES:
        raise EconomicsError("invalid confidence_class")
    continuation = out.get("continuation_expected_value_minor")
    if continuation is not None and (isinstance(continuation, bool) or not isinstance(continuation, int)):
        raise EconomicsError("continuation_expected_value_minor must be integer or null")
    reference_price = out.get("reference_price_minor")
    if reference_price is not None and (isinstance(reference_price, bool) or not isinstance(reference_price, int) or reference_price < 0):
        raise EconomicsError("reference_price_minor must be a non-negative integer or null")
    out["economics_version_id"] = economics_version_id
    out["solution_id"] = solution_id
    return out


def assess_economic_value(
    conversion: Conversion,
    profile: Mapping[str, Any],
) -> EconomicAssessment:
    """Calculate economic value without treating reference price as realised revenue."""
    p = validate_economics_profile(profile)
    if conversion.solution_id != p["solution_id"]:
        raise EconomicsError("economics profile belongs to another solution")
    if conversion.revenue_minor is None:
        raise EconomicsError("monetary economic assessment requires observed conversion revenue")
    if conversion.currency != p["currency"]:
        raise EconomicsError("conversion currency does not match economics profile")

    revenue = int(conversion.revenue_minor)
    variable = int(p["variable_cost_minor"])
    human_cost = int(p["human_effort_cost_minor"])
    immediate = revenue - variable - human_cost
    continuation = p.get("continuation_expected_value_minor")
    expected_total = immediate + continuation if continuation is not None else None
    inputs = {
        "source_event_id": conversion.source_event_id,
        "solution_id": conversion.solution_id,
        "revenue_minor": revenue,
        "currency": conversion.currency,
        "economics_version_id": p["economics_version_id"],
        "variable_cost_minor": variable,
        "human_effort_minutes": int(p["human_effort_minutes"]),
        "human_effort_cost_minor": human_cost,
        "continuation_expected_value_minor": continuation,
        "scalability_score": int(p["scalability_score"]),
        "repeatability_class": p.get("repeatability_class", "unknown"),
        "confidence_class": p["confidence_class"],
        "calculation_version": ECONOMICS_CALCULATION_VERSION,
    }
    return EconomicAssessment(
        economic_assessment_id=_new_id("eva_"),
        conversion_id=conversion.conversion_id,
        economics_version_id=p["economics_version_id"],
        revenue_minor=revenue,
        variable_cost_minor=variable,
        human_effort_minutes=int(p["human_effort_minutes"]),
        human_effort_cost_minor=human_cost,
        immediate_contribution_minor=immediate,
        continuation_expected_value_minor=continuation,
        expected_total_value_minor=expected_total,
        scalability_score=int(p["scalability_score"]),
        repeatability_class=p.get("repeatability_class", "unknown"),
        confidence_class=p["confidence_class"],
        calculation_version=ECONOMICS_CALCULATION_VERSION,
        input_hash=_sha256(inputs),
    )


def attribution_summary(conversion: Conversion) -> dict[str, Any]:
    first = [t.event_id for t in conversion.touches if t.role in {"first", "first_last"}]
    last = [t.event_id for t in conversion.touches if t.role in {"last", "first_last"}]
    assisted = [t.event_id for t in conversion.touches if t.role == "assisted"]
    return {
        "first_touch": first[0] if first else None,
        "last_touch": last[-1] if last else None,
        "assisted_touches": assisted,
        "touch_count": len(conversion.touches),
        "method": "position_role_v1",
    }
