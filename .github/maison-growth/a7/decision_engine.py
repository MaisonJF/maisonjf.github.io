#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

ROOT = Path(__file__).resolve().parent
POLICY_FILE = ROOT / "decision-policy.json"

EMAIL_RE = re.compile(r"(?i)(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9._%+-])")
IBAN_RE = re.compile(r"(?i)\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
CARDISH_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")
FORBIDDEN_KEYS = {
    "email", "customer_email", "billing_email", "phone", "telephone", "mobile", "name", "full_name",
    "first_name", "last_name", "address", "postal_code", "nif", "vat_number", "tax_id", "iban",
    "card_number", "billing_details", "shipping_details", "stripe_customer_id", "customer_id",
    "oracle_response", "oracle_answer", "oracle_content", "reading_text", "paid_oracle_text",
    "response_text", "answer_text"
}
FORBIDDEN_FRAGMENTS = ("oracle_response", "oracle_answer", "paid_oracle", "reading_text", "billing_details", "shipping_details")

class DecisionError(Exception): pass
class ValidationError(DecisionError): pass
class PrivacyViolation(DecisionError): pass

@dataclass(frozen=True)
class GateResult:
    gate: str
    passed: bool
    reason_code: str
    evidence_refs: tuple[str, ...] = ()

@dataclass(frozen=True)
class ScoreResult:
    score: int
    components: Mapping[str, int]
    policy_version: str

@dataclass(frozen=True)
class Decision:
    decision: str
    hard_gates_passed: bool
    discovery_score: Optional[int]
    commercial_score: Optional[int]
    confidence_score: int
    reason_codes: tuple[str, ...]
    evidence_refs: tuple[str, ...]
    rule_version_id: str
    model_version_id: Optional[str]
    rejected_alternatives: tuple[Mapping[str, Any], ...]
    recommended_solution_id: Optional[str]
    human_review_required: bool
    public_side_effects: bool
    evaluation_order: tuple[str, ...]
    input_hash: str


def _canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def load_policy() -> dict[str, Any]:
    policy = json.loads(POLICY_FILE.read_text(encoding="utf-8"))
    if policy.get("default") != "deny":
        raise ValidationError("A7 policy must remain deny-by-default")
    if sum(policy["discovery_weights"].values()) != 100 or sum(policy["commercial_weights"].values()) != 100:
        raise ValidationError("A7 scoring weights must each total 100")
    return policy


def privacy_scan(value: Any, path: str = "$") -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            if not isinstance(key, str):
                raise PrivacyViolation(f"{path}: non-string key")
            normalized = key.strip().lower()
            if normalized in FORBIDDEN_KEYS or any(fragment in normalized for fragment in FORBIDDEN_FRAGMENTS):
                raise PrivacyViolation(f"{path}.{key}: forbidden PII or paid-content field")
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
                raise PrivacyViolation(f"{path}: card-like direct PII detected")


def evaluate_hard_gates(
    supplied: Mapping[str, bool],
    *,
    for_promotion: bool,
    evidence_refs_by_gate: Optional[Mapping[str, Sequence[str]]] = None,
    policy: Optional[Mapping[str, Any]] = None,
) -> tuple[GateResult, ...]:
    cfg = dict(policy or load_policy())
    required = list(cfg["core_hard_gates"])
    if for_promotion:
        required += list(cfg["promotion_hard_gates"])
    unknown = set(supplied) - set(cfg["core_hard_gates"]) - set(cfg["promotion_hard_gates"])
    if unknown:
        raise ValidationError(f"unknown hard gates: {sorted(unknown)}")
    evidence_map = evidence_refs_by_gate or {}
    results: list[GateResult] = []
    for gate in required:
        passed = supplied.get(gate) is True
        reason = f"gate_{gate}_passed" if passed else f"gate_{gate}_blocked"
        results.append(GateResult(gate, passed, reason, tuple(sorted(set(evidence_map.get(gate, ()))))))
    return tuple(results)


def _score(values: Mapping[str, int], weights: Mapping[str, int], policy_version: str) -> ScoreResult:
    unknown = set(values) - set(weights)
    missing = set(weights) - set(values)
    if unknown or missing:
        raise ValidationError(f"score dimensions mismatch unknown={sorted(unknown)} missing={sorted(missing)}")
    components: dict[str, int] = {}
    total = 0.0
    for key, weight in weights.items():
        raw = values[key]
        if isinstance(raw, bool) or not isinstance(raw, int) or not 0 <= raw <= 100:
            raise ValidationError(f"{key} must be integer 0..100")
        contribution = raw * weight / 100.0
        components[key] = round(contribution)
        total += contribution
    return ScoreResult(round(total), components, policy_version)


def discovery_score(values: Mapping[str, int], policy: Optional[Mapping[str, Any]] = None) -> ScoreResult:
    cfg = dict(policy or load_policy())
    return _score(values, cfg["discovery_weights"], cfg["policy_version"])


def commercial_score(values: Mapping[str, int], policy: Optional[Mapping[str, Any]] = None) -> ScoreResult:
    cfg = dict(policy or load_policy())
    return _score(values, cfg["commercial_weights"], cfg["policy_version"])


def recommend_existing_solution(solutions: Sequence[Mapping[str, Any]]) -> Optional[str]:
    if not solutions:
        return None
    cleaned = []
    for item in solutions:
        privacy_scan(item)
        solution_id = item.get("solution_id")
        fit = item.get("fit_strength", 0)
        journey_support = item.get("journey_support", 0)
        economic_confidence = item.get("economic_confidence", 0)
        if not isinstance(solution_id, str) or not solution_id.startswith("sol_"):
            raise ValidationError("solution_id required")
        for value in (fit, journey_support, economic_confidence):
            if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 100:
                raise ValidationError("solution recommendation scores must be 0..100")
        cleaned.append((fit, journey_support, economic_confidence, solution_id))
    cleaned.sort(reverse=True)
    return cleaned[0][3]


def decide(context: Mapping[str, Any], *, policy: Optional[Mapping[str, Any]] = None) -> Decision:
    """Deterministic A7 decision. Hard gates are evaluated before either score."""
    privacy_scan(context)
    cfg = dict(policy or load_policy())
    rule_version_id = str(context.get("rule_version_id", ""))
    if not rule_version_id.startswith("rul_"):
        raise ValidationError("rule_version_id is required")
    model_version_id = context.get("model_version_id")
    if model_version_id is not None and not str(model_version_id).startswith("mdl_"):
        raise ValidationError("model_version_id must be null or mdl_ id")

    requested = str(context.get("requested_decision", "observe"))
    if requested not in cfg["allowed_decisions"]:
        raise ValidationError("unsupported requested_decision")
    for_promotion = requested == "propose_promotion"

    gate_results = evaluate_hard_gates(
        context.get("hard_gates", {}),
        for_promotion=for_promotion,
        evidence_refs_by_gate=context.get("gate_evidence", {}),
        policy=cfg,
    )
    hard_gates_passed = all(item.passed for item in gate_results)
    gate_reasons = [item.reason_code for item in gate_results]
    gate_evidence = [ref for item in gate_results for ref in item.evidence_refs]

    # Scores deliberately occur only after gate evaluation.
    dscore = discovery_score(context.get("discovery_dimensions", {}), cfg)
    cscore = commercial_score(context.get("commercial_dimensions", {}), cfg) if context.get("commercial_dimensions") is not None else None

    evidence_refs = tuple(sorted(set(str(x) for x in context.get("evidence_refs", ())) | set(gate_evidence)))
    evidence_sources = tuple(sorted(set(str(x) for x in context.get("evidence_sources", ()))))
    conflicting = bool(context.get("conflicting_evidence", False))
    base_confidence = context.get("confidence_score", 50)
    if isinstance(base_confidence, bool) or not isinstance(base_confidence, int) or not 0 <= base_confidence <= 100:
        raise ValidationError("confidence_score must be integer 0..100")
    confidence = min(base_confidence, int(cfg["conflict_confidence_cap"])) if conflicting else base_confidence

    reasons = list(gate_reasons)
    alternatives: list[Mapping[str, Any]] = []
    recommended_solution_id: Optional[str] = None
    decision = "observe"
    human_review_required = False

    if conflicting:
        reasons.append("evidence_conflict")
        alternatives.append({"decision": requested, "reason_codes": ["evidence_conflict_requires_observation"]})
    elif not hard_gates_passed:
        reasons.append("hard_gate_blocked")
        alternatives.append({"decision": requested, "reason_codes": [x.reason_code for x in gate_results if not x.passed]})
    else:
        brain_state = str(context.get("brain_state", "observe"))
        public_coverage = str(context.get("public_coverage", "none"))
        gap_type = context.get("gap_type")
        solutions = context.get("existing_solutions", ())
        cta_test_relevant = bool(context.get("cta_test_relevant", False))

        if brain_state == "alias_candidate":
            decision = "alias"; reasons.append("brain_alias_candidate")
        elif public_coverage == "redundant":
            decision = "interlink"; reasons.append("redundant_public_coverage")
        elif public_coverage == "partial" or brain_state == "reinforcement_candidate":
            decision = "reinforce"; reasons.append("partial_coverage_reinforcement")
        elif gap_type in {"journey", "positioning"} and solutions:
            recommended_solution_id = recommend_existing_solution(solutions)
            if gap_type == "journey" and cta_test_relevant:
                decision = "test_cta"; reasons.append("journey_gap_existing_solution_test")
            else:
                decision = "recommend_solution"; reasons.append("existing_solution_matches_gap")
        elif gap_type == "product" and not solutions:
            decision = "commercial_gap"; reasons.append("product_gap_without_existing_solution"); human_review_required = True
        elif gap_type == "content" or brain_state == "internal_candidate":
            decision = "create_internal_candidate"; reasons.append("content_gap_internal_only")
        elif requested == "propose_promotion":
            if len(evidence_sources) < int(cfg["minimum_independent_evidence_sources"]):
                decision = "observe"; reasons.append("insufficient_independent_evidence")
                alternatives.append({"decision": "propose_promotion", "reason_codes": ["insufficient_independent_evidence"]})
            elif dscore.score >= int(cfg["promotion_score_threshold"]):
                decision = "propose_promotion"; reasons.append("promotion_score_threshold_met"); human_review_required = True
            else:
                decision = "observe"; reasons.append("promotion_score_below_threshold")
                alternatives.append({"decision": "propose_promotion", "reason_codes": ["promotion_score_below_threshold"]})
        elif requested in {"observe", "alias", "reinforce", "interlink", "test_cta", "create_internal_candidate", "recommend_solution", "commercial_gap"}:
            decision = requested; reasons.append("requested_internal_decision_allowed")
        else:
            decision = "observe"; reasons.append("no_safe_action_selected")

    if decision in {"propose_promotion", "commercial_gap"}:
        human_review_required = True
    if decision == "propose_promotion" and not hard_gates_passed:
        raise AssertionError("score must never override hard gates")

    payload = {
        "decision": decision,
        "gates": [(x.gate, x.passed) for x in gate_results],
        "discovery_score": dscore.score,
        "commercial_score": None if cscore is None else cscore.score,
        "confidence": confidence,
        "evidence": evidence_refs,
        "rule": rule_version_id,
        "model": model_version_id,
        "alternatives": alternatives,
        "solution": recommended_solution_id,
    }
    return Decision(
        decision=decision,
        hard_gates_passed=hard_gates_passed,
        discovery_score=dscore.score,
        commercial_score=None if cscore is None else cscore.score,
        confidence_score=confidence,
        reason_codes=tuple(dict.fromkeys(reasons)),
        evidence_refs=evidence_refs,
        rule_version_id=rule_version_id,
        model_version_id=None if model_version_id is None else str(model_version_id),
        rejected_alternatives=tuple(alternatives),
        recommended_solution_id=recommended_solution_id,
        human_review_required=human_review_required,
        public_side_effects=False,
        evaluation_order=("hard_gates", "discovery_score", "commercial_score", "decision"),
        input_hash=_sha(payload),
    )
