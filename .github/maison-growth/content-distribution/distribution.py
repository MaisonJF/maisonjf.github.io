#!/usr/bin/env python3
from __future__ import annotations

import copy
import re
from typing import Any, Mapping

from planner import CHANNELS, ContentContractError, _stable_id, _text, privacy_scan

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def build_distribution_packet(
    approved_review_package: Mapping[str, Any],
    *,
    channel: str,
    planned_date: str,
    comparison: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a copy/paste-ready manual distribution packet. Never calls an external platform."""
    privacy_scan(approved_review_package)
    channel = _text(channel, "channel", 80, True)
    if channel not in CHANNELS:
        raise ContentContractError("unsupported_distribution_channel")
    planned_date = _text(planned_date, "planned_date", 20, True)
    if not DATE_RE.fullmatch(planned_date):
        raise ContentContractError("planned_date_must_be_iso_day")

    if approved_review_package.get("status") != "approved_for_manual_distribution":
        raise ContentContractError("distribution_requires_human_approved_content")
    human_review_ref = _text(
        approved_review_package.get("human_review_ref"),
        "human_review_ref",
        160,
        True,
    )
    fmt = _text(approved_review_package.get("format"), "format", 80, True)
    if CHANNELS[channel]["format"] != fmt:
        raise ContentContractError("distribution_channel_format_mismatch")

    allowed_channels = approved_review_package.get("channels")
    if not isinstance(allowed_channels, list) or channel not in allowed_channels:
        raise ContentContractError("distribution_channel_not_approved_for_piece")

    content_id = _text(approved_review_package.get("content_id"), "content_id", 100, True)
    campaign_id = _text(approved_review_package.get("campaign_id"), "campaign_id", 100, False)
    thesis_id = _text(approved_review_package.get("thesis_id"), "thesis_id", 100, False)

    comparison_id = ""
    comparison_dimension = ""
    variant_key = ""
    if comparison is not None:
        privacy_scan(comparison)
        comparison_id = _text(comparison.get("comparison_id"), "comparison_id", 100, True)
        comparison_dimension = _text(comparison.get("dimension"), "comparison_dimension", 80, True)
        variants = comparison.get("variants")
        if not isinstance(variants, list):
            raise ContentContractError("comparison_variants_required")
        match = next((v for v in variants if isinstance(v, Mapping) and v.get("content_id") == content_id), None)
        if not match:
            raise ContentContractError("content_not_part_of_comparison")
        variant_key = _text(match.get("variant_key"), "variant_key", 100, True)
        if match.get("channel") != channel:
            raise ContentContractError("distribution_channel_does_not_match_comparison_variant")

    platform = CHANNELS[channel]["platform"]
    surface = CHANNELS[channel]["surface"]
    distribution_id = _stable_id("dst", {
        "content_id": content_id,
        "channel": channel,
        "planned_date": planned_date,
        "human_review_ref": human_review_ref,
        "comparison_id": comparison_id,
        "variant_key": variant_key,
    })

    return {
        "contract_version": "CONTENT-DISTRIBUTION-1.0",
        "distribution_packet_id": distribution_id,
        "content_id": content_id,
        "campaign_id": campaign_id or None,
        "thesis_id": thesis_id or None,
        "comparison_id": comparison_id or None,
        "comparison_dimension": comparison_dimension or None,
        "variant_key": variant_key or None,
        "channel": channel,
        "platform": platform,
        "surface": surface,
        "format": fmt,
        "planned_date": planned_date,
        "public_copy": copy.deepcopy(dict(approved_review_package.get("public_copy") or {})),
        "visual_brief": copy.deepcopy(dict(approved_review_package.get("visual_brief") or {})),
        "cta": copy.deepcopy(dict(approved_review_package.get("cta") or {})),
        "human_review_ref": human_review_ref,
        "manual_execution": {
            "required": True,
            "operator_instruction": "Publicar manualmente apenas depois de confirmar que a plataforma e a peça correspondem a este pacote.",
            "external_api_call": False,
            "automatic_scheduling": False,
            "automatic_publication": False,
        },
        "measurement_context": {
            "feedback_builder": "build_performance_feedback",
            "required_lineage": {
                "content_id": content_id,
                "campaign_id": campaign_id or None,
                "thesis_id": thesis_id or None,
                "comparison_id": comparison_id or None,
                "comparison_dimension": comparison_dimension or None,
                "variant_key": variant_key or None,
                "channel": channel,
                "format": fmt,
                "human_review_ref": human_review_ref,
            },
        },
    }


def build_feedback_observation(
    distribution_packet: Mapping[str, Any],
    *,
    observed_at: str,
    window_start: str,
    window_end: str,
    source_refs: list[str],
    metrics: Mapping[str, int],
) -> dict[str, Any]:
    """Prepare the exact input expected by planner.build_performance_feedback."""
    privacy_scan(distribution_packet)
    if distribution_packet.get("manual_execution", {}).get("required") is not True:
        raise ContentContractError("invalid_distribution_packet")
    return {
        "content_id": distribution_packet.get("content_id"),
        "campaign_id": distribution_packet.get("campaign_id"),
        "thesis_id": distribution_packet.get("thesis_id"),
        "comparison_id": distribution_packet.get("comparison_id"),
        "comparison_dimension": distribution_packet.get("comparison_dimension"),
        "variant_key": distribution_packet.get("variant_key"),
        "channel": distribution_packet.get("channel"),
        "format": distribution_packet.get("format"),
        "intent": "observed_distribution",
        "observed_at": observed_at,
        "window_start": window_start,
        "window_end": window_end,
        "human_review_ref": distribution_packet.get("human_review_ref"),
        "source_refs": list(source_refs),
        "manual_distribution_confirmed": True,
        "metrics": dict(metrics),
    }
