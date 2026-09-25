#!/usr/bin/env python3
from __future__ import annotations

import copy
import re
from typing import Any, Mapping, Sequence

from planner import (
    ALLOWED_CTAS,
    FORMATS,
    ContentContractError,
    _stable_id,
    _text,
    privacy_scan,
    validate_public_copy,
)

FORMAT_FIELDS = {
    "short_video": {
        "required": ("hook", "spoken_body", "caption", "cta_text"),
        "list_fields": (),
    },
    "story_sequence": {
        "required": ("frames", "cta_text"),
        "list_fields": ("frames",),
    },
    "carousel_post": {
        "required": ("cover", "slides", "caption", "cta_text"),
        "list_fields": ("slides",),
    },
    "editorial_page": {
        "required": ("title", "opening", "body", "cta_text"),
        "list_fields": (),
    },
}

PLACEHOLDER_RE = re.compile(r"(?i)(?:\blorem ipsum\b|\bplaceholder\b|\[\s*(?:cta|texto|copy|hook|caption)\s*\])")
CERTAINTY_RE = re.compile(r"(?i)\b(?:garantido|garantia de resultado|vai curar|cura garantida|100% certo)\b")
FAKE_URGENCY_RE = re.compile(r"(?i)\b(?:ultima oportunidade|última oportunidade|so hoje|só hoje|agora ou nunca)\b")


def build_authoring_packet(content_plan: Mapping[str, Any], context: Mapping[str, Any]) -> dict[str, Any]:
    privacy_scan(content_plan)
    privacy_scan(context)
    content_id = _text(content_plan.get("content_id"), "content_id", 100, True)
    fmt = _text(content_plan.get("format") or content_plan.get("primary", {}).get("format"), "format", 80, True)
    if fmt not in FORMAT_FIELDS or fmt not in FORMATS:
        raise ContentContractError("unsupported_authoring_format")

    intent = _text(content_plan.get("intent"), "intent", 80, True)
    campaign_id = _text(content_plan.get("campaign_id"), "campaign_id", 100, False)
    thesis_id = _text(content_plan.get("thesis_id"), "thesis_id", 100, False)
    role = _text(content_plan.get("role"), "role", 80, False)

    human_tension = _text(context.get("human_tension"), "human_tension", 280, True)
    desire = _text(context.get("desire"), "desire", 220, False)
    audience_moment = _text(context.get("audience_moment"), "audience_moment", 220, False)
    cta_kind = _text(context.get("cta_kind"), "cta_kind", 80, True)
    if cta_kind not in ALLOWED_CTAS:
        raise ContentContractError("unsupported_cta_kind")
    destination = _text(context.get("approved_destination_ref"), "approved_destination_ref", 180, False)
    if cta_kind == "visit_existing_destination" and not destination:
        raise ContentContractError("commercial_cta_requires_approved_destination")
    if cta_kind != "visit_existing_destination" and destination:
        raise ContentContractError("destination_ref_only_allowed_for_commercial_cta")

    packet_id = _stable_id("aut", {
        "content_id": content_id,
        "format": fmt,
        "intent": intent,
        "campaign_id": campaign_id,
        "thesis_id": thesis_id,
        "role": role,
        "human_tension": human_tension,
        "cta_kind": cta_kind,
        "destination": destination,
    })

    spec = FORMAT_FIELDS[fmt]
    return {
        "contract_version": "CONTENT-AUTHORING-1.0",
        "authoring_packet_id": packet_id,
        "content_id": content_id,
        "campaign_id": campaign_id or None,
        "thesis_id": thesis_id or None,
        "role": role or None,
        "format": fmt,
        "intent": intent,
        "channels": list(FORMATS[fmt]["channels"]),
        "context": {
            "human_tension": human_tension,
            "desire": desire or None,
            "audience_moment": audience_moment or None,
        },
        "cta": {
            "kind": cta_kind,
            "approved_destination_ref": destination or None,
            "may_invent_destination": False,
            "may_invent_urgency_or_scarcity": False,
        },
        "draft_schema": {
            "required_fields": list(spec["required"]),
            "list_fields": list(spec["list_fields"]),
        },
        "writing_direction": {
            "voice_source": "functions/_lib/maison-content-ontology.js",
            "principle": "João escreve. Brain pensa. MAISON fala.",
            "method_checks": [
                "one_clear_human_idea",
                "concrete_pain_or_desire",
                "recognisable_spoken_language",
                "unexpected_turn_only_if_it_earns_attention",
                "ethical_non_coercive_persuasion",
                "no_engine_language",
                "no_fake_certainty",
            ],
        },
        "visual_direction": {
            "source": ".github/maison-growth/VISUAL-DIRECTION.md",
            "brief_required_before_review": True,
        },
        "state": "awaiting_draft",
        "automatic_publication": False,
    }


def _collect_copy(draft: Mapping[str, Any], list_fields: set[str]) -> tuple[dict[str, str], list[str]]:
    strings: dict[str, str] = {}
    errors: list[str] = []
    for key, value in draft.items():
        if key in list_fields:
            if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
                errors.append(f"{key}:must_be_string_list")
                continue
            if not 1 <= len(value) <= 20:
                errors.append(f"{key}:list_length_invalid")
                continue
            for index, item in enumerate(value):
                if not isinstance(item, str) or not item.strip():
                    errors.append(f"{key}[{index}]:text_required")
                else:
                    strings[f"{key}[{index}]"] = item.strip()
        elif isinstance(value, str):
            strings[key] = value.strip()
        else:
            errors.append(f"{key}:copy_must_be_string")
    return strings, errors


def validate_draft(packet: Mapping[str, Any], draft: Mapping[str, Any]) -> dict[str, Any]:
    privacy_scan(packet)
    privacy_scan(draft)
    fmt = _text(packet.get("format"), "format", 80, True)
    if fmt not in FORMAT_FIELDS:
        raise ContentContractError("unsupported_authoring_format")
    if not isinstance(draft, Mapping):
        raise ContentContractError("draft_object_required")

    spec = FORMAT_FIELDS[fmt]
    required = set(spec["required"])
    missing = sorted(key for key in required if key not in draft)
    extra = sorted(set(draft) - required)

    errors = [f"missing:{key}" for key in missing]
    errors.extend(f"unexpected:{key}" for key in extra)

    strings, shape_errors = _collect_copy(draft, set(spec["list_fields"]))
    errors.extend(shape_errors)

    voice = validate_public_copy(strings)
    errors.extend(voice["errors"])
    warnings = list(voice["warnings"])

    for key, text in strings.items():
        if not text:
            errors.append(f"{key}:text_required")
            continue
        if PLACEHOLDER_RE.search(text):
            errors.append(f"{key}:placeholder_copy_forbidden")
        if CERTAINTY_RE.search(text):
            errors.append(f"{key}:fake_certainty_forbidden")
        if FAKE_URGENCY_RE.search(text):
            errors.append(f"{key}:fake_urgency_or_scarcity_forbidden")

    cta = packet.get("cta") if isinstance(packet.get("cta"), Mapping) else {}
    cta_kind = str(cta.get("kind") or "")
    destination = str(cta.get("approved_destination_ref") or "")
    cta_text = str(draft.get("cta_text") or "").strip()
    if cta_kind == "none" and cta_text:
        warnings.append("cta_text:packet_requested_no_cta")
    if cta_kind == "visit_existing_destination" and not destination:
        errors.append("cta_text:approved_destination_required")

    return {
        "ok": not errors,
        "errors": tuple(dict.fromkeys(errors)),
        "warnings": tuple(dict.fromkeys(warnings)),
        "checked_fields": tuple(sorted(strings)),
    }


def build_review_package(
    packet: Mapping[str, Any],
    draft: Mapping[str, Any],
    visual_brief: Mapping[str, Any],
) -> dict[str, Any]:
    privacy_scan(visual_brief)
    validation = validate_draft(packet, draft)
    visual_required = ("subject", "setting", "mood")
    visual_errors = []
    for key in visual_required:
        if not _text(visual_brief.get(key), f"visual_{key}", 300, False):
            visual_errors.append(f"visual:{key}_required")

    all_errors = tuple(validation["errors"]) + tuple(visual_errors)
    status = "blocked" if all_errors else "needs_human_review"
    return {
        "contract_version": "CONTENT-AUTHORING-1.0",
        "review_package_id": _stable_id("rvp", {
            "packet": packet.get("authoring_packet_id"),
            "draft": draft,
            "visual": visual_brief,
        }),
        "authoring_packet_id": packet.get("authoring_packet_id"),
        "content_id": packet.get("content_id"),
        "campaign_id": packet.get("campaign_id"),
        "thesis_id": packet.get("thesis_id"),
        "format": packet.get("format"),
        "channels": copy.deepcopy(packet.get("channels", [])),
        "public_copy": copy.deepcopy(dict(draft)),
        "visual_brief": copy.deepcopy(dict(visual_brief)),
        "cta": copy.deepcopy(dict(packet.get("cta", {}))),
        "validation": {
            "ok": not all_errors,
            "errors": all_errors,
            "warnings": tuple(validation["warnings"]),
        },
        "status": status,
        "human_review_required": True,
        "automatic_publication": False,
    }


def approve_for_manual_distribution(
    review_package: Mapping[str, Any],
    *,
    human_review_ref: str,
    approval_scope: str,
) -> dict[str, Any]:
    privacy_scan(review_package)
    review_ref = _text(human_review_ref, "human_review_ref", 160, True)
    if approval_scope != "content_and_cta":
        raise ContentContractError("approval_scope_must_be_content_and_cta")
    validation = review_package.get("validation")
    if not isinstance(validation, Mapping) or validation.get("ok") is not True:
        raise ContentContractError("cannot_approve_invalid_draft")
    if review_package.get("status") != "needs_human_review":
        raise ContentContractError("review_package_not_ready_for_approval")

    return {
        **copy.deepcopy(dict(review_package)),
        "status": "approved_for_manual_distribution",
        "human_review_ref": review_ref,
        "approval_scope": approval_scope,
        "distribution": {
            "manual_only": True,
            "automatic_scheduling": False,
            "automatic_publication": False,
            "outbound_authorized": False,
        },
    }
