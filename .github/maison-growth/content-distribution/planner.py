#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
import re
from typing import Any, Mapping, Sequence

FORMATS = {
    "short_video": {
        "channels": ("instagram_reels", "youtube_shorts", "tiktok"),
        "structure": ("hook", "recognition", "turn", "movement", "cta"),
        "reuse": ("story_sequence", "carousel_post"),
    },
    "story_sequence": {
        "channels": ("instagram_stories",),
        "structure": ("scene", "mirror", "tension", "gesture", "cta"),
        "reuse": ("short_video", "carousel_post"),
    },
    "carousel_post": {
        "channels": ("instagram_feed",),
        "structure": ("cover", "recognition", "development", "turn", "movement", "cta"),
        "reuse": ("short_video", "story_sequence", "editorial_page"),
    },
    "editorial_page": {
        "channels": ("maison_site",),
        "structure": ("opening", "recognition", "depth", "reframe", "possible_gesture", "cta"),
        "reuse": ("carousel_post", "short_video", "story_sequence"),
    },
}
CHANNELS = {
    "instagram_reels": {"platform": "instagram", "surface": "reels", "format": "short_video"},
    "youtube_shorts": {"platform": "youtube", "surface": "shorts", "format": "short_video"},
    "tiktok": {"platform": "tiktok", "surface": "video", "format": "short_video"},
    "instagram_stories": {"platform": "instagram", "surface": "stories", "format": "story_sequence"},
    "instagram_feed": {"platform": "instagram", "surface": "feed", "format": "carousel_post"},
    "maison_site": {"platform": "maison_site", "surface": "editorial", "format": "editorial_page"},
}

INTENT_PRIMARY = {
    "recognition": "short_video",
    "tension": "short_video",
    "reframe": "carousel_post",
    "education": "carousel_post",
    "movement": "short_video",
    "commercial": "story_sequence",
}

HOOK_JOBS = (
    {
        "family": "recognition",
        "instruction": "Abrir com uma situacao concreta que a pessoa reconhece imediatamente.",
    },
    {
        "family": "pattern_break",
        "instruction": "Virar uma leitura comum sem fabricar choque, certeza ou polemica.",
    },
    {
        "family": "specific_moment",
        "instruction": "Entrar por um momento real e observavel, nao por uma teoria.",
    },
)

ALLOWED_AXES = {"casa", "corpo", "cabeca", "transversal"}
ALLOWED_INTENTS = set(INTENT_PRIMARY)
ALLOWED_CTAS = {"none", "save", "share", "reply", "reflect", "visit_existing_destination"}

EMAIL_RE = re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")
IBAN_RE = re.compile(r"(?i)\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
CARDISH_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")
PUBLIC_DASH_RE = re.compile(r"[—–]")
INTERNAL_PUBLIC_RE = re.compile(
    r"(?i)\b(?:A7|A8|A11|A12|A13|A14|Maison Brain|opportunity_ref|commercial_attention|taxonomy gate|editorial queue)\b"
)
AIISH_RE = re.compile(
    r"(?i)\b(?:como (?:uma )?ia|neste conteudo vamos explorar|e importante salientar|em suma|de forma holistica)\b"
)

FORBIDDEN_KEYS = {
    "email", "phone", "name", "full_name", "address", "postal_code", "nif", "iban",
    "card_number", "billing_details", "shipping_details", "customer_id",
    "oracle_response", "oracle_answer", "oracle_content", "reading_text",
    "paid_oracle_text", "answer_text", "response_text",
}


class ContentContractError(ValueError):
    pass


class PrivacyViolation(ContentContractError):
    pass


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _stable_id(prefix: str, value: Any) -> str:
    return f"{prefix}_{_sha(value)[:32]}"


def _text(value: Any, field: str, max_len: int = 500, required: bool = False) -> str:
    if value is None:
        if required:
            raise ContentContractError(f"{field}_required")
        return ""
    if not isinstance(value, str):
        raise ContentContractError(f"{field}_must_be_string")
    cleaned = " ".join(value.split()).strip()
    if required and not cleaned:
        raise ContentContractError(f"{field}_required")
    return cleaned[:max_len]


def _refs(value: Any, field: str = "source_refs") -> tuple[str, ...]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        raise ContentContractError(f"{field}_must_be_list")
    refs = tuple(dict.fromkeys(str(x).strip() for x in value if str(x).strip()))
    if not refs:
        raise ContentContractError(f"{field}_required")
    if len(refs) > 20:
        raise ContentContractError(f"{field}_too_many")
    return refs


def privacy_scan(value: Any, path: str = "$") -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            normalized = str(key).strip().lower()
            if normalized in FORBIDDEN_KEYS:
                raise PrivacyViolation(f"{path}.{key}: forbidden field")
            privacy_scan(child, f"{path}.{key}")
    elif isinstance(value, (list, tuple)):
        for index, child in enumerate(value):
            privacy_scan(child, f"{path}[{index}]")
    elif isinstance(value, str):
        if EMAIL_RE.search(value) or IBAN_RE.search(value):
            raise PrivacyViolation(f"{path}: direct PII detected")
        if CARDISH_RE.search(value):
            digits = re.sub(r"\D", "", value)
            if 13 <= len(digits) <= 19:
                raise PrivacyViolation(f"{path}: card-like PII detected")


def validate_public_copy(parts: Mapping[str, str]) -> dict[str, tuple[str, ...]]:
    errors: list[str] = []
    warnings: list[str] = []
    for key, value in parts.items():
        if not isinstance(value, str):
            errors.append(f"{key}:copy_must_be_string")
            continue
        if PUBLIC_DASH_RE.search(value):
            errors.append(f"{key}:public_voice_dash_forbidden")
        if INTERNAL_PUBLIC_RE.search(value):
            errors.append(f"{key}:internal_engine_language_forbidden")
        if AIISH_RE.search(value):
            warnings.append(f"{key}:generic_ai_or_manual_tone")
    return {"errors": tuple(errors), "warnings": tuple(warnings)}


def build_brief(
    signal: Mapping[str, Any],
    *,
    preferred_format: str | None = None,
    approved_destination_ref: str | None = None,
) -> dict[str, Any]:
    privacy_scan(signal)
    source_refs = _refs(signal.get("source_refs"))
    axis = _text(signal.get("axis"), "axis", 40, True).lower()
    intent = _text(signal.get("intent"), "intent", 40, True).lower()
    human_tension = _text(signal.get("human_tension"), "human_tension", 280, True)
    desire = _text(signal.get("desire"), "desire", 220, False)
    audience_moment = _text(signal.get("audience_moment"), "audience_moment", 220, False)
    opportunity_ref = _text(signal.get("opportunity_ref"), "opportunity_ref", 160, False)

    if axis not in ALLOWED_AXES:
        raise ContentContractError("unsupported_axis")
    if intent not in ALLOWED_INTENTS:
        raise ContentContractError("unsupported_intent")

    primary_format = preferred_format or INTENT_PRIMARY[intent]
    if primary_format not in FORMATS:
        raise ContentContractError("unsupported_format")

    destination_ref = _text(approved_destination_ref, "approved_destination_ref", 180, False)
    cta_kind = "visit_existing_destination" if destination_ref else (
        "reply" if intent in {"recognition", "tension"} else
        "save" if intent in {"education", "reframe"} else
        "reflect"
    )
    if cta_kind not in ALLOWED_CTAS:
        raise AssertionError("CTA map drift")
    if intent == "commercial" and not destination_ref:
        cta_kind = "reflect"

    identity = {
        "source_refs": source_refs,
        "axis": axis,
        "intent": intent,
        "human_tension": human_tension,
        "desire": desire,
        "audience_moment": audience_moment,
        "opportunity_ref": opportunity_ref,
        "primary_format": primary_format,
    }
    content_id = _stable_id("cnt", identity)

    primary = FORMATS[primary_format]
    derivatives = []
    for derivative_format in primary["reuse"]:
        derivatives.append({
            "content_id": _stable_id("cnt", {"source_content_id": content_id, "format": derivative_format}),
            "source_content_id": content_id,
            "format": derivative_format,
            "channels": list(FORMATS[derivative_format]["channels"]),
            "relationship": "same_idea_new_surface",
            "must_change": ["entry", "rhythm", "density"],
        })

    return {
        "contract_version": "CONTENT-DISTRIBUTION-1.0",
        "content_id": content_id,
        "state": "needs_editorial_review",
        "canonical_source_refs": list(source_refs),
        "opportunity_ref": opportunity_ref or None,
        "axis": axis,
        "intent": intent,
        "human_tension": human_tension,
        "desire": desire or None,
        "audience_moment": audience_moment or None,
        "primary": {
            "format": primary_format,
            "channels": list(primary["channels"]),
            "structure": list(primary["structure"]),
            "hook_jobs": copy.deepcopy(list(HOOK_JOBS)),
            "copy_fields": list(primary["structure"]),
        },
        "cta": {
            "kind": cta_kind,
            "approved_destination_ref": destination_ref or None,
            "may_create_new_offer": False,
            "may_invent_urgency_or_scarcity": False,
        },
        "reuse_plan": derivatives,
        "voice": {
            "source": "functions/_lib/maison-content-ontology.js",
            "principle": "João escreve. Brain pensa. MAISON fala.",
            "pt_pt": True,
            "internal_engine_language_public": False,
            "long_dash_public": False,
        },
        "review": {
            "human_editorial_review_required": True,
            "human_review_ref": None,
            "approved_for_manual_distribution": False,
        },
        "distribution": {
            "manual_only": True,
            "automatic_publication": False,
            "automatic_scheduling": False,
            "outbound_authorized": False,
            "spend_authorized": False,
        },
        "learning": {
            "feedback_event_type": "content.performance_observed",
            "canonical_ingestion": "A2 v1 -> A1 v2",
            "economic_value_owner": "A3",
            "learning_owner": "Brain/A11 after central mapping",
        },
    }


def build_manual_calendar(
    approved_items: Sequence[Mapping[str, Any]],
    slots: Sequence[Mapping[str, str]],
) -> list[dict[str, Any]]:
    if len(approved_items) > len(slots):
        raise ContentContractError("not_enough_calendar_slots")
    out: list[dict[str, Any]] = []
    for item, slot in zip(approved_items, slots):
        privacy_scan(item)
        if item.get("state") != "approved_for_manual_distribution":
            raise ContentContractError("calendar_requires_human_approved_state")
        review_ref = str(item.get("human_review_ref") or "").strip()
        if not review_ref:
            raise ContentContractError("calendar_requires_human_review_ref")
        fmt = str(item.get("format") or "")
        if fmt not in FORMATS:
            raise ContentContractError("calendar_unknown_format")
        channel = str(slot.get("channel") or "")
        if channel not in FORMATS[fmt]["channels"]:
            raise ContentContractError("calendar_channel_format_mismatch")
        date = str(slot.get("date") or "")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            raise ContentContractError("calendar_date_must_be_iso_day")
        out.append({
            "content_id": item.get("content_id"),
            "format": fmt,
            "channel": channel,
            "date": date,
            "human_review_ref": review_ref,
            "execution": "manual_only",
            "automatic_publication": False,
        })
    return out


def _non_negative_metric(metrics: Mapping[str, Any], key: str) -> int | float | None:
    if key not in metrics or metrics[key] is None:
        return None
    value = metrics[key]
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
        raise ContentContractError(f"invalid_metric:{key}")
    return value


def _rate_bps(numerator: int | None, denominator: int | None) -> int | None:
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return round(int(numerator) * 10000 / int(denominator))


def build_performance_feedback(observation: Mapping[str, Any]) -> dict[str, Any]:
    """Build an A2 ingestion payload. A2 remains the canonical A1 normalization boundary."""
    privacy_scan(observation)
    content_id = _text(observation.get("content_id"), "content_id", 100, True)
    channel = _text(observation.get("channel"), "channel", 80, True)
    if channel not in CHANNELS:
        raise ContentContractError("unsupported_distribution_channel")
    platform = CHANNELS[channel]["platform"]
    surface = CHANNELS[channel]["surface"]
    content_format = _text(observation.get("format"), "format", 80, True)
    if CHANNELS[channel]["format"] != content_format:
        raise ContentContractError("channel_format_mismatch")
    content_intent = _text(observation.get("intent"), "intent", 80, True)
    observed_at = _text(observation.get("observed_at"), "observed_at", 80, True)
    window_start = _text(observation.get("window_start"), "window_start", 80, True)
    window_end = _text(observation.get("window_end"), "window_end", 80, True)
    human_review_ref = _text(observation.get("human_review_ref"), "human_review_ref", 160, True)
    campaign_id = _text(observation.get("campaign_id"), "campaign_id", 100, False)
    thesis_id = _text(observation.get("thesis_id"), "thesis_id", 100, False)
    comparison_id = _text(observation.get("comparison_id"), "comparison_id", 100, False)
    comparison_dimension = _text(observation.get("comparison_dimension"), "comparison_dimension", 80, False)
    variant_key = _text(observation.get("variant_key"), "variant_key", 100, False)
    if comparison_dimension and comparison_dimension not in {"hook_family", "format", "cta_kind"}:
        raise ContentContractError("unsupported_comparison_dimension")
    if comparison_id and not comparison_dimension:
        raise ContentContractError("comparison_dimension_required_with_comparison_id")
    source_refs = _refs(observation.get("source_refs"))
    metrics_input = observation.get("metrics")
    if not isinstance(metrics_input, Mapping):
        raise ContentContractError("metrics_object_required")

    keys = (
        "impressions", "reach", "video_starts", "views", "completions",
        "watch_seconds", "shares", "saves", "comments", "profile_visits",
        "link_clicks", "leads", "conversions",
    )
    metrics: dict[str, int] = {}
    for key in keys:
        value = _non_negative_metric(metrics_input, key)
        if value is None:
            continue
        if not isinstance(value, int) or isinstance(value, bool):
            raise ContentContractError(f"metric_must_be_integer:{key}")
        metrics[key] = value
    if not metrics:
        raise ContentContractError("at_least_one_observed_metric_required")

    rates_bps = {
        "completion_rate_bps": _rate_bps(metrics.get("completions"), metrics.get("video_starts")),
        "save_rate_bps": _rate_bps(metrics.get("saves"), metrics.get("reach")),
        "share_rate_bps": _rate_bps(metrics.get("shares"), metrics.get("reach")),
        "click_rate_bps": _rate_bps(metrics.get("link_clicks"), metrics.get("reach")),
        "conversion_rate_bps": _rate_bps(metrics.get("conversions"), metrics.get("link_clicks")),
    }
    rates_bps = {key: value for key, value in rates_bps.items() if value is not None}

    source_refs_hash = _sha(list(source_refs))
    idempotency_key = _sha({
        "content_id": content_id,
        "channel": channel,
        "platform": platform,
        "surface": surface,
        "window_start": window_start,
        "window_end": window_end,
    })

    metadata: dict[str, Any] = {
        "content_id": content_id,
        **({"campaign_id": campaign_id} if campaign_id else {}),
        **({"thesis_id": thesis_id} if thesis_id else {}),
        **({"comparison_id": comparison_id} if comparison_id else {}),
        **({"comparison_dimension": comparison_dimension} if comparison_dimension else {}),
        **({"variant_key": variant_key} if variant_key else {}),
        "channel": channel,
        "platform": platform,
        "surface": surface,
        "format": content_format,
        "intent": content_intent,
        "window_start": window_start,
        "window_end": window_end,
        "human_review_ref": human_review_ref,
        "source_refs_hash": source_refs_hash,
        "manual_distribution_confirmed": observation.get("manual_distribution_confirmed") is True,
        **metrics,
        **rates_bps,
    }

    ingestion = {
        "contract_version": 1,
        "source": "maison-content-distribution",
        "event_type": "content.performance_observed",
        "occurred_at": observed_at,
        "idempotency_key": idempotency_key,
        "privacy_class": "aggregated",
        "metadata": metadata,
    }

    return {
        "ingestion": ingestion,
        "learning_context": {
            "content_id": content_id,
            "channel": channel,
            "platform": platform,
            "surface": surface,
            "campaign_id": campaign_id or None,
            "thesis_id": thesis_id or None,
            "comparison_id": comparison_id or None,
            "comparison_dimension": comparison_dimension or None,
            "variant_key": variant_key or None,
            "source_refs": list(source_refs),
            "source_refs_hash": source_refs_hash,
            "observed_metrics": metrics,
            "derived_rates_bps": rates_bps,
            "causal_claim": False,
            "economic_value_inferred": False,
            "recommended_winner": None,
            "next_boundary": "A2 -> A1; downstream Brain/A11 mapping remains governed by existing contracts",
        },
    }
