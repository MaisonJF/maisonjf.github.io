#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any, Mapping, Optional


def _canonical(value: Any) -> str:
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))


def _stable_id(prefix: str, value: Any) -> str:
    digest=hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()
    return prefix+str(uuid.uuid5(uuid.NAMESPACE_URL,f"https://maison-jf.com/validation/{prefix}/{digest}"))


def choose_plan_kind(row: Mapping[str,Any]) -> str:
    """Map an approved offer to the validator that actually matches purchase behaviour."""
    existing=row.get("existing_solution_id")
    mode=str(row.get("validation_mode") or "").lower()
    offer=str(row.get("offer_type") or "").lower()

    if existing and mode in {"cta_test","cta_route","journey_test","existing_solution_cta"}:
        return "a8_cta_existing_solution"
    if offer in {"b2b","wholesale","white_label","corporate_gifting","licensing","ip_content_licensing"}:
        return "manual_b2b_pilot"
    if offer in {"service","workshop","experience"}:
        return "manual_service_pilot"
    if offer in {"physical_product","bundle","personalisation"}:
        return "manual_physical_pilot"
    if offer=="partnership":
        return "manual_distribution_pilot"
    return "manual_validation"


def build_validation_plan(row: Mapping[str,Any]) -> dict[str,Any]:
    if row.get("decision") not in (None,"approved"):
        raise ValueError("approved_review_required")
    if row.get("approved_scope") not in (None,"experiment_planning_only"):
        raise ValueError("planning_only_scope_required")

    review_id=str(row["review_resolution_id"])
    opportunity_id=str(row["opportunity_id"])
    offer_id=str(row["offer_hypothesis_id"])
    plan_kind=choose_plan_kind(row)
    existing=row.get("existing_solution_id")
    refs=json.loads(row.get("evidence_refs_json") or "[]") if isinstance(row.get("evidence_refs_json"),str) else list(row.get("evidence_refs") or [])
    reasons=json.loads(row.get("reason_codes_json") or "[]") if isinstance(row.get("reason_codes_json"),str) else list(row.get("reason_codes") or [])
    offer=str(row.get("offer_type") or "offer")
    territory=str(row.get("territory_code") or "unknown territory")

    if plan_kind=="a8_cta_existing_solution":
        state="blocked_needs_a7_decision"
        metric="economic_value_per_eligible_session"
        hypothesis=f"Routing an eligible Maison CTA to the existing {offer} solution may improve observed economic value in {territory}."
        reasons.append("a8_requires_canonical_a7_test_cta_decision")
    else:
        state="manual_pilot_required"
        metric=None
        hypothesis=f"A small {plan_kind.replace('_',' ')} can validate demand for the approved {offer} opportunity in {territory} without assuming revenue."
        reasons.append("validation_must_match_purchase_behaviour")

    fingerprint={
        "review_resolution_id":review_id,
        "opportunity_id":opportunity_id,
        "offer_hypothesis_id":offer_id,
        "plan_kind":plan_kind,
        "existing_solution_id":existing,
        "validation_mode":row.get("validation_mode"),
    }
    return {
        "validation_plan_id":_stable_id("vpl_",fingerprint),
        "review_resolution_id":review_id,
        "opportunity_id":opportunity_id,
        "offer_hypothesis_id":offer_id,
        "plan_kind":plan_kind,
        "existing_solution_id":existing,
        "a7_decision_id":None,
        "a8_experiment_id":None,
        "hypothesis":hypothesis,
        "validation_mode":row.get("validation_mode"),
        "primary_metric_key":metric,
        "evidence_refs":sorted(set(map(str,refs))),
        "reason_codes":list(dict.fromkeys(map(str,reasons))),
        "state":state,
        "public_write_authorized":False,
        "outbound_authorized":False,
        "spend_authorized":False,
        "experiment_execution_authorized":False,
    }


def a8_eligibility(plan: Mapping[str,Any], *, a7_decision: Optional[Mapping[str,Any]]) -> dict[str,Any]:
    """A8 eligibility is narrow: existing solution + canonical A7 test_cta decision."""
    if plan.get("plan_kind")!="a8_cta_existing_solution":
        return {"eligible":False,"reason":"validation_mode_not_supported_by_a8"}
    if not plan.get("existing_solution_id"):
        return {"eligible":False,"reason":"existing_solution_required"}
    if not a7_decision:
        return {"eligible":False,"reason":"canonical_a7_decision_required"}
    if a7_decision.get("decision_type")!="test_cta":
        return {"eligible":False,"reason":"a7_test_cta_decision_required"}
    if not bool(a7_decision.get("hard_gates_passed")):
        return {"eligible":False,"reason":"a7_hard_gates_must_pass"}
    if a7_decision.get("recommended_solution_id")!=plan.get("existing_solution_id"):
        return {"eligible":False,"reason":"a7_solution_mismatch"}
    return {
        "eligible":True,
        "reason":"ready_for_a8_draft_only",
        "experiment_execution_authorized":False,
        "public_write_authorized":False,
    }
