#!/usr/bin/env python3
from __future__ import annotations

from typing import Any, Mapping, Sequence

from planner import (
    ALLOWED_CTAS,
    CHANNELS,
    FORMATS,
    ContentContractError,
    _sha,
    _stable_id,
    _text,
    privacy_scan,
)

CAMPAIGN_ROLES = (
    "recognise",
    "cost_of_ignoring",
    "reframe",
    "movement",
    "commercial_bridge",
)

ROLE_INTENTS = {
    "recognise": "recognition",
    "cost_of_ignoring": "tension",
    "reframe": "reframe",
    "movement": "movement",
    "commercial_bridge": "commercial",
}

ROLE_FORMATS = {
    "recognise": "short_video",
    "cost_of_ignoring": "carousel_post",
    "reframe": "short_video",
    "movement": "story_sequence",
    "commercial_bridge": "carousel_post",
}

COMPARISON_DIMENSIONS = {"hook_family", "format", "cta_kind"}
OBSERVABLE_METRICS = {
    "impressions", "reach", "video_starts", "views", "completions",
    "watch_seconds", "shares", "saves", "comments", "profile_visits",
    "link_clicks", "leads", "conversions",
    "completion_rate_bps", "save_rate_bps", "share_rate_bps",
    "click_rate_bps", "conversion_rate_bps",
}


def build_campaign(source_brief: Mapping[str, Any], *, include_commercial_bridge: bool = True) -> dict[str, Any]:
    """Create a derived campaign/cohort around one reviewed Brain-derived brief."""
    privacy_scan(source_brief)
    content_id = _text(source_brief.get("content_id"), "content_id", 100, True)
    axis = _text(source_brief.get("axis"), "axis", 40, True)
    human_tension = _text(source_brief.get("human_tension"), "human_tension", 280, True)
    source_refs = source_brief.get("canonical_source_refs")
    if not isinstance(source_refs, Sequence) or isinstance(source_refs, (str, bytes)) or not source_refs:
        raise ContentContractError("canonical_source_refs_required")
    source_refs = tuple(str(x) for x in source_refs)

    cta = source_brief.get("cta")
    if not isinstance(cta, Mapping):
        raise ContentContractError("source_brief_cta_required")
    destination = cta.get("approved_destination_ref")
    if destination is not None:
        destination = _text(destination, "approved_destination_ref", 180, False) or None

    roles = list(CAMPAIGN_ROLES)
    if not include_commercial_bridge:
        roles.remove("commercial_bridge")

    campaign_identity = {
        "source_content_id": content_id,
        "source_refs_hash": _sha(list(source_refs)),
        "axis": axis,
        "human_tension": human_tension,
        "destination": destination,
        "roles": roles,
    }
    campaign_id = _stable_id("cmp", campaign_identity)
    thesis_id = _stable_id("ths", {
        "source_refs_hash": campaign_identity["source_refs_hash"],
        "human_tension": human_tension,
    })

    pieces: list[dict[str, Any]] = []
    for role in roles:
        intent = ROLE_INTENTS[role]
        fmt = ROLE_FORMATS[role]
        if role == "commercial_bridge" and not destination:
            intent = "movement"
        piece_identity = {
            "campaign_id": campaign_id,
            "thesis_id": thesis_id,
            "role": role,
            "intent": intent,
            "format": fmt,
        }
        pieces.append({
            "content_id": _stable_id("cnt", piece_identity),
            "campaign_id": campaign_id,
            "thesis_id": thesis_id,
            "source_content_id": content_id,
            "role": role,
            "intent": intent,
            "format": fmt,
            "channels": list(FORMATS[fmt]["channels"]),
            "approved_destination_ref": destination if role == "commercial_bridge" else None,
            "state": "brief",
            "human_editorial_review_required": True,
            "automatic_publication": False,
        })

    return {
        "contract_version": "CONTENT-OPS-1.0",
        "campaign_id": campaign_id,
        "cohort_id": _stable_id("coh", {"campaign_id": campaign_id, "thesis_id": thesis_id}),
        "thesis_id": thesis_id,
        "source_content_id": content_id,
        "source_refs_hash": campaign_identity["source_refs_hash"],
        "axis": axis,
        "campaign_thesis": human_tension,
        "pieces": pieces,
        "state": "planning",
        "derived_only": True,
        "canonical_intelligence_owner": "Maison Brain",
        "human_review_required_per_piece": True,
        "automatic_publication": False,
    }


def _variant_projection(piece: Mapping[str, Any]) -> dict[str, str]:
    channel = _text(piece.get("channel"), "channel", 80, True)
    if channel not in CHANNELS:
        raise ContentContractError("comparison_unknown_channel")
    fmt = _text(piece.get("format"), "format", 80, True)
    if CHANNELS[channel]["format"] != fmt:
        raise ContentContractError("comparison_channel_format_mismatch")
    return {
        "campaign_id": _text(piece.get("campaign_id"), "campaign_id", 100, True),
        "thesis_id": _text(piece.get("thesis_id"), "thesis_id", 100, True),
        "content_id": _text(piece.get("content_id"), "content_id", 100, True),
        "channel": channel,
        "platform": CHANNELS[channel]["platform"],
        "surface": CHANNELS[channel]["surface"],
        "format": fmt,
        "hook_family": _text(piece.get("hook_family"), "hook_family", 80, True),
        "cta_kind": _text(piece.get("cta_kind"), "cta_kind", 80, True),
        "approved_destination_ref": _text(piece.get("approved_destination_ref"), "approved_destination_ref", 180, False),
    }


def build_comparison_plan(
    variants: Sequence[Mapping[str, Any]],
    *,
    dimension: str,
    primary_metric: str,
) -> dict[str, Any]:
    """Plan an observational comparison; this is deliberately not an A8 randomized experiment."""
    if dimension not in COMPARISON_DIMENSIONS:
        raise ContentContractError("unsupported_comparison_dimension")
    if primary_metric not in OBSERVABLE_METRICS:
        raise ContentContractError("unsupported_primary_metric")
    if not isinstance(variants, Sequence) or isinstance(variants, (str, bytes)) or len(variants) < 2:
        raise ContentContractError("comparison_requires_at_least_two_variants")

    projected = []
    for item in variants:
        privacy_scan(item)
        row = _variant_projection(item)
        if row["format"] not in FORMATS:
            raise ContentContractError("comparison_unknown_format")
        if row["cta_kind"] not in ALLOWED_CTAS:
            raise ContentContractError("comparison_unknown_cta")
        projected.append(row)

    campaign_ids = {x["campaign_id"] for x in projected}
    thesis_ids = {x["thesis_id"] for x in projected}
    if len(campaign_ids) != 1:
        raise ContentContractError("comparison_requires_same_campaign")
    if len(thesis_ids) != 1:
        raise ContentContractError("comparison_requires_same_thesis")

    if dimension in {"hook_family", "cta_kind"} and len({x["channel"] for x in projected}) != 1:
        raise ContentContractError("comparison_requires_same_channel")
    if dimension == "format" and len({x["platform"] for x in projected}) != 1:
        raise ContentContractError("format_comparison_requires_same_platform")

    controlled_fields = ("format", "hook_family", "cta_kind")
    for field in controlled_fields:
        distinct = {x[field] for x in projected}
        if field == dimension:
            if len(distinct) < 2:
                raise ContentContractError("comparison_dimension_did_not_change")
        elif len(distinct) != 1:
            raise ContentContractError(f"comparison_changed_multiple_dimensions:{field}")

    if dimension == "cta_kind":
        if any(x["cta_kind"] == "visit_existing_destination" for x in projected):
            raise ContentContractError("commercial_destination_routing_belongs_to_A8")
        if len({x["approved_destination_ref"] for x in projected}) != 1:
            raise ContentContractError("comparison_destination_must_stay_constant")

    comparison_id = _stable_id("cpr", {
        "campaign_id": projected[0]["campaign_id"],
        "thesis_id": projected[0]["thesis_id"],
        "dimension": dimension,
        "primary_metric": primary_metric,
        "variants": [{k: x[k] for k in ("content_id", dimension)} for x in projected],
    })

    return {
        "contract_version": "CONTENT-OPS-1.0",
        "comparison_id": comparison_id,
        "campaign_id": projected[0]["campaign_id"],
        "thesis_id": projected[0]["thesis_id"],
        "dimension": dimension,
        "primary_metric": primary_metric,
        "variants": [
            {
                "content_id": x["content_id"],
                "variant_key": _stable_id("var", {
                    "comparison_id": comparison_id,
                    "content_id": x["content_id"],
                    "value": x[dimension],
                }),
                "value": x[dimension],
                "channel": x["channel"],
                "platform": x["platform"],
                "surface": x["surface"],
                "format": x["format"],
            }
            for x in projected
        ],
        "comparison_type": "observational_manual_distribution",
        "randomized": False,
        "causal_claim": False,
        "automatic_winner": False,
        "automatic_promotion": False,
        "human_interpretation_required": True,
    }


def build_campaign_calendar(
    campaign: Mapping[str, Any],
    approved_pieces: Sequence[Mapping[str, Any]],
    slots: Sequence[Mapping[str, str]],
) -> list[dict[str, Any]]:
    """Attach human-approved campaign pieces to explicit manual slots."""
    privacy_scan(campaign)
    campaign_id = _text(campaign.get("campaign_id"), "campaign_id", 100, True)
    known_ids = {
        str(x.get("content_id"))
        for x in campaign.get("pieces", ())
        if isinstance(x, Mapping) and x.get("content_id")
    }
    if not known_ids:
        raise ContentContractError("campaign_has_no_pieces")
    if len(approved_pieces) > len(slots):
        raise ContentContractError("not_enough_calendar_slots")

    seen = set()
    plan = []
    for piece, slot in zip(approved_pieces, slots):
        privacy_scan(piece)
        content_id = _text(piece.get("content_id"), "content_id", 100, True)
        if content_id not in known_ids:
            raise ContentContractError("piece_not_in_campaign")
        if piece.get("state") != "approved_for_manual_distribution":
            raise ContentContractError("calendar_requires_human_approved_state")
        review_ref = _text(piece.get("human_review_ref"), "human_review_ref", 160, True)
        fmt = _text(piece.get("format"), "format", 80, True)
        if fmt not in FORMATS:
            raise ContentContractError("calendar_unknown_format")
        channel = _text(slot.get("channel"), "channel", 80, True)
        date = _text(slot.get("date"), "date", 20, True)
        if channel not in FORMATS[fmt]["channels"]:
            raise ContentContractError("calendar_channel_format_mismatch")
        if len(date) != 10 or date[4] != "-" or date[7] != "-":
            raise ContentContractError("calendar_date_must_be_iso_day")
        key = (content_id, channel, date)
        if key in seen:
            raise ContentContractError("duplicate_content_channel_day")
        seen.add(key)
        plan.append({
            "campaign_id": campaign_id,
            "content_id": content_id,
            "format": fmt,
            "channel": channel,
            "date": date,
            "human_review_ref": review_ref,
            "execution": "manual_only",
            "automatic_scheduling": False,
            "automatic_publication": False,
        })
    return plan


def interpret_comparison(
    comparison: Mapping[str, Any],
    observations: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Return a directional observation without claiming causality or auto-selecting a winner."""
    privacy_scan(comparison)
    comparison_id = _text(comparison.get("comparison_id"), "comparison_id", 100, True)
    metric = _text(comparison.get("primary_metric"), "primary_metric", 80, True)
    if metric not in OBSERVABLE_METRICS:
        raise ContentContractError("unsupported_primary_metric")

    variant_ids = {
        str(x.get("content_id"))
        for x in comparison.get("variants", ())
        if isinstance(x, Mapping) and x.get("content_id")
    }
    if len(variant_ids) < 2:
        raise ContentContractError("comparison_variants_missing")

    values = []
    for obs in observations:
        privacy_scan(obs)
        cid = _text(obs.get("content_id"), "content_id", 100, True)
        if cid not in variant_ids:
            raise ContentContractError("observation_not_in_comparison")
        observed_metrics = obs.get("metrics")
        if not isinstance(observed_metrics, Mapping):
            raise ContentContractError("observation_metrics_required")
        value = observed_metrics.get(metric)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0:
            raise ContentContractError("invalid_comparison_metric")
        values.append((cid, value))

    by_content = {}
    for cid, value in values:
        by_content.setdefault(cid, []).append(value)

    summaries = []
    for cid in sorted(variant_ids):
        sample = by_content.get(cid, [])
        summaries.append({
            "content_id": cid,
            "observation_count": len(sample),
            "observed_average": None if not sample else round(sum(sample) / len(sample), 4),
        })

    available = [x for x in summaries if x["observed_average"] is not None]
    directional = None
    if len(available) >= 2:
        ordered = sorted(available, key=lambda x: (x["observed_average"], x["content_id"]), reverse=True)
        if ordered[0]["observed_average"] != ordered[1]["observed_average"]:
            directional = ordered[0]["content_id"]

    return {
        "comparison_id": comparison_id,
        "primary_metric": metric,
        "summaries": summaries,
        "stronger_observed_variant": directional,
        "signal_kind": "directional_observation" if directional else "insufficient_or_tied",
        "causal_claim": False,
        "automatic_winner": False,
        "automatic_promotion": False,
        "human_interpretation_required": True,
    }
