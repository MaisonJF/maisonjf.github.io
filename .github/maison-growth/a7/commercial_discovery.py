#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Mapping, Optional, Sequence

from decision_engine import ValidationError, commercial_score, privacy_scan, recommend_existing_solution

ALLOWED_GAPS = {"content", "journey", "product", "positioning"}
ALLOWED_CANDIDATE_TYPES = {
    "digital_product", "ebook", "physical_product", "service", "accompaniment",
    "subscription", "experience", "oracle_usage", "b2b", "uncategorized"
}

@dataclass(frozen=True)
class GapAssessment:
    gap_type: str
    status: str
    confidence_score: int
    reason_codes: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    existing_solution_ids: tuple[str, ...]
    recommended_solution_id: Optional[str]
    input_hash: str


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def assess_gap(
    *,
    gap_type: str,
    evidence_refs: Sequence[str],
    existing_solutions: Sequence[Mapping[str, Any]],
    confidence_score: int,
    observed_demand: bool = True,
    journey_friction: bool = False,
    positioning_mismatch: bool = False,
) -> GapAssessment:
    payload = {
        "gap_type": gap_type,
        "evidence_refs": list(evidence_refs),
        "existing_solutions": list(existing_solutions),
        "confidence_score": confidence_score,
        "observed_demand": observed_demand,
        "journey_friction": journey_friction,
        "positioning_mismatch": positioning_mismatch,
    }
    privacy_scan(payload)
    if gap_type not in ALLOWED_GAPS:
        raise ValidationError("unsupported commercial gap type")
    if isinstance(confidence_score, bool) or not isinstance(confidence_score, int) or not 0 <= confidence_score <= 100:
        raise ValidationError("confidence_score must be 0..100")
    solution_ids = tuple(str(x["solution_id"]) for x in existing_solutions)
    recommended = recommend_existing_solution(existing_solutions) if existing_solutions else None
    reasons = [f"{gap_type}_gap_assessed"]
    status = "detected" if observed_demand else "observe"
    if gap_type == "journey" and journey_friction and recommended:
        reasons.append("journey_friction_with_existing_solution")
    if gap_type == "positioning" and positioning_mismatch and recommended:
        reasons.append("positioning_mismatch_with_existing_solution")
    if gap_type == "product" and recommended:
        reasons.append("existing_solution_may_cover_product_gap")
        status = "observe"
    if gap_type == "product" and not recommended and observed_demand:
        reasons.append("no_existing_solution_for_demand")
    if gap_type == "content" and recommended:
        reasons.append("solution_exists_content_missing")
    return GapAssessment(
        gap_type=gap_type,
        status=status,
        confidence_score=confidence_score,
        reason_codes=tuple(reasons),
        evidence_refs=tuple(sorted(set(str(x) for x in evidence_refs))),
        existing_solution_ids=tuple(sorted(set(solution_ids))),
        recommended_solution_id=recommended,
        input_hash=_sha(payload),
    )


def make_commercial_candidate(
    *,
    working_name: str,
    candidate_type: str,
    primary_need_id: str,
    intent_ids: Sequence[str],
    gap: GapAssessment,
    commercial_dimensions: Mapping[str, int],
    economy: Mapping[str, Any],
    complexity_class: str,
    human_effort_class: str,
    risk_class: str,
    differentiation_score: int,
    rule_version_id: str,
    model_version_id: Optional[str] = None,
) -> Mapping[str, Any]:
    payload = {
        "working_name": working_name,
        "candidate_type": candidate_type,
        "primary_need_id": primary_need_id,
        "intent_ids": list(intent_ids),
        "gap": gap.__dict__,
        "commercial_dimensions": dict(commercial_dimensions),
        "economy": dict(economy),
        "complexity_class": complexity_class,
        "human_effort_class": human_effort_class,
        "risk_class": risk_class,
        "differentiation_score": differentiation_score,
        "rule_version_id": rule_version_id,
        "model_version_id": model_version_id,
    }
    privacy_scan(payload)
    if candidate_type not in ALLOWED_CANDIDATE_TYPES:
        raise ValidationError("unsupported candidate_type")
    if gap.gap_type != "product":
        raise ValidationError("new commercial candidate requires a product gap; content/journey/positioning gaps should first use existing assets/solutions")
    if gap.existing_solution_ids:
        raise ValidationError("commercial candidate blocked while an existing solution may cover the need")
    if gap.status != "detected":
        raise ValidationError("commercial candidate requires a detected gap")
    if not primary_need_id.startswith("ned_") or not rule_version_id.startswith("rul_"):
        raise ValidationError("stable need/rule IDs required")
    score = commercial_score(commercial_dimensions)
    reasons = list(gap.reason_codes) + ["commercial_candidate_requires_human_review"]
    if score.score >= 70:
        reasons.append("commercial_priority_signal")
    return {
        "working_name": working_name.strip(),
        "candidate_type": candidate_type,
        "primary_need_id": primary_need_id,
        "intent_ids": tuple(sorted(set(intent_ids))),
        "gap_type": gap.gap_type,
        "evidence_refs": gap.evidence_refs,
        "existing_solution_ids": (),
        "commercial_score": score.score,
        "economy": dict(economy),
        "complexity_class": complexity_class,
        "human_effort_class": human_effort_class,
        "risk_class": risk_class,
        "differentiation_score": differentiation_score,
        "confidence_score": gap.confidence_score,
        "reason_codes": tuple(dict.fromkeys(reasons)),
        "status": "human_review_required",
        "human_decision_required": True,
        "launch_authorized": False,
        "price_authorized": False,
        "public_side_effects": False,
        "rule_version_id": rule_version_id,
        "model_version_id": model_version_id,
        "input_hash": _sha(payload),
    }
