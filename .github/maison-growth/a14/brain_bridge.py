#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import secrets
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, Optional, Sequence

from opportunity_engine import (
    ActivationEconomics,
    EvidenceMetric,
    MoneyMetric,
    choose_offer_path,
    compute_activation_economics,
    map_offer_to_a3_solution_type,
    recommend_activation,
    score_distribution_fit,
    score_universal_opportunity,
)


@dataclass(frozen=True)
class A14Policy:
    policy_version: str
    minimum_distribution_fit: float
    minimum_distribution_confidence: float


def _uuid7() -> uuid.UUID:
    ms = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = secrets.randbits(12)
    rand_b = secrets.randbits(62)
    value = (ms << 80) | (0x7 << 76) | (rand_a << 64) | (0b10 << 62) | rand_b
    return uuid.UUID(int=value)


def new_id(prefix: str) -> str:
    return f"{prefix}{_uuid7()}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _hash(payload: Any) -> str:
    text = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_opportunity_record(
    *,
    need_id: Optional[str],
    territory_code: Optional[str],
    metrics: Mapping[str, EvidenceMetric],
    existing_solution_ids: Sequence[str],
    knowledge_context_refs: Sequence[str],
    rule_version_id: str,
    model_version_id: Optional[str] = None,
) -> dict[str, Any]:
    score = score_universal_opportunity(metrics)
    existing = tuple(sorted(set(existing_solution_ids)))
    status = "observe"
    reasons = ["a14_evidence_weighted_opportunity"]
    if score.score is not None and score.confidence > 0:
        status = "human_review_required"
        reasons.append("commercial_hypothesis_requires_human_review")
    if existing:
        reasons.append("existing_asset_first")

    payload = {
        "need_id": need_id,
        "territory_code": territory_code,
        "metrics": {
            key: {
                "value": value.value,
                "status": value.status,
                "confidence": value.confidence,
                "evidence_refs": value.evidence_refs,
            }
            for key, value in sorted(metrics.items())
        },
        "existing_solution_ids": tuple(existing),
        "knowledge_context_refs": tuple(sorted(set(knowledge_context_refs))),
        "rule_version_id": rule_version_id,
        "model_version_id": model_version_id,
    }
    return {
        "opportunity_id": new_id("opp_"),
        "need_id": need_id,
        "territory_code": territory_code,
        "opportunity_score": score.score,
        "confidence": score.confidence,
        "known_dimensions": score.known_dimensions,
        "unknown_dimensions": score.unknown_dimensions,
        "evidence_refs": score.evidence_refs,
        "existing_solution_ids": existing,
        "knowledge_context_refs": tuple(sorted(set(knowledge_context_refs))),
        "status": status,
        "reason_codes": tuple(reasons),
        "rule_version_id": rule_version_id,
        "model_version_id": model_version_id,
        "input_hash": _hash(payload),
        "created_at": _now(),
    }


def build_offer_hypothesis(
    *,
    opportunity_id: str,
    offer_type: str,
    existing_solution_ids: Sequence[str],
    fit_metrics: Mapping[str, EvidenceMetric],
    validation_mode: Optional[str],
    economics: Mapping[str, Any],
) -> dict[str, Any]:
    path = choose_offer_path(existing_solution_ids, (offer_type,))
    fit = score_universal_opportunity(fit_metrics)
    existing_solution_id = path["existing_solution_ids"][0] if path["existing_solution_ids"] else None
    return {
        "offer_hypothesis_id": new_id("ofh_"),
        "opportunity_id": opportunity_id,
        "offer_type": offer_type,
        "a3_solution_type": map_offer_to_a3_solution_type(offer_type),
        "existing_solution_id": existing_solution_id,
        "fit_score": fit.score,
        "fit_confidence": fit.confidence,
        "economics": dict(economics),
        "validation_mode": validation_mode,
        "evidence_refs": fit.evidence_refs,
        "reason_codes": path["reason_codes"],
        "created_at": _now(),
    }


def build_distribution_match(
    *,
    offer_hypothesis_id: str,
    amplifier_ref: str,
    moment_key: str,
    story_angle_key: Optional[str],
    channel_class: str,
    fit_metrics: Mapping[str, EvidenceMetric],
    direct_cost: MoneyMetric,
    expected_direct_revenue: MoneyMetric,
    expected_direct_margin: MoneyMetric,
    monetized_indirect_value: MoneyMetric,
    policy: A14Policy,
    seedable: bool,
) -> dict[str, Any]:
    fit = score_distribution_fit(fit_metrics)
    economics = compute_activation_economics(
        direct_cost=direct_cost,
        expected_direct_revenue=expected_direct_revenue,
        expected_direct_margin=expected_direct_margin,
        monetized_indirect_value=monetized_indirect_value,
    )
    rec = recommend_activation(
        fit=fit,
        economics=economics,
        minimum_fit=policy.minimum_distribution_fit,
        minimum_confidence=policy.minimum_distribution_confidence,
        channel_class=channel_class,
        seedable=seedable,
    )
    return {
        "distribution_match_id": new_id("dma_"),
        "offer_hypothesis_id": offer_hypothesis_id,
        "amplifier_ref": amplifier_ref,
        "moment_key": moment_key,
        "story_angle_key": story_angle_key,
        "channel_class": channel_class,
        "fit_score": fit.score,
        "fit_confidence": fit.confidence,
        "known_dimensions": fit.known_dimensions,
        "unknown_dimensions": fit.unknown_dimensions,
        "evidence_refs": fit.evidence_refs,
        "economics": asdict(economics),
        "recommended_strategy": rec.strategy,
        "recommendation_state": rec.state,
        "a12_review_ref": None,
        "experiment_id": None,
        "created_at": _now(),
    }


def build_a12_review_payload(
    *,
    opportunity: Mapping[str, Any],
    offer_hypothesis: Mapping[str, Any],
    distribution_match: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """A12 receives recommendation data only; this payload grants no execution authority."""
    return {
        "source_module": "A14",
        "action_kind": "commercial_recommendation_review",
        "opportunity_id": opportunity["opportunity_id"],
        "offer_hypothesis_id": offer_hypothesis["offer_hypothesis_id"],
        "distribution_match_id": distribution_match.get("distribution_match_id") if distribution_match else None,
        "risk_class": "medium" if distribution_match else "low",
        "human_approval_required": True,
        "outbound_authorized": False,
        "spend_authorized": False,
        "public_write_authorized": False,
        "evidence_refs": sorted(set(
            list(opportunity.get("evidence_refs", ()))
            + list(offer_hypothesis.get("evidence_refs", ()))
            + (list(distribution_match.get("evidence_refs", ())) if distribution_match else [])
        )),
        "reason_codes": sorted(set(
            list(opportunity.get("reason_codes", ()))
            + list(offer_hypothesis.get("reason_codes", ()))
            + ([distribution_match.get("recommended_strategy")] if distribution_match else [])
        )),
    }
