#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
import uuid
from pathlib import Path
from typing import Any, Mapping, Sequence

ROOT=Path(__file__).resolve().parent
A8_DIR=ROOT.parent/"a8"
if str(A8_DIR) not in sys.path:
    sys.path.insert(0,str(A8_DIR))

from experiment_manager import Definition, Variant, validate_definition  # noqa:E402


class A8DraftPlanningError(ValueError):
    pass


def _canonical(value: Any) -> str:
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))


def _sha(value: Any) -> str:
    return hashlib.sha256(_canonical(value).encode("utf-8")).hexdigest()


def _stable_id(prefix: str, payload: Any) -> str:
    digest=_sha(payload)
    value=uuid.uuid5(uuid.NAMESPACE_URL,f"https://maison-jf.com/a8/{prefix}/{digest}")
    return prefix+str(value)


def load_a8_policy() -> dict[str,Any]:
    return json.loads((A8_DIR/"experiment-policy.json").read_text(encoding="utf-8"))


def select_a7_decision(
    decisions: Sequence[Mapping[str,Any]],
    *,
    treatment_solution_id: str,
    explicit_decision_id: str | None=None,
) -> Mapping[str,Any]:
    eligible=[
        row for row in decisions
        if row.get("decision_type")=="test_cta"
        and bool(row.get("hard_gates_passed"))
        and row.get("recommended_solution_id")==treatment_solution_id
    ]
    if explicit_decision_id:
        chosen=[row for row in eligible if row.get("decision_id")==explicit_decision_id]
        if len(chosen)!=1:
            raise A8DraftPlanningError("explicit_a7_decision_not_eligible")
        return chosen[0]
    if not eligible:
        raise A8DraftPlanningError("no_eligible_a7_test_cta_decision")
    if len(eligible)>1:
        raise A8DraftPlanningError("multiple_a7_decisions_require_explicit_selection")
    return eligible[0]


def build_a8_draft(
    validation_plan: Mapping[str,Any],
    *,
    a7_decisions: Sequence[Mapping[str,Any]],
    cta_context: Mapping[str,Any],
) -> dict[str,Any]:
    if validation_plan.get("plan_kind")!="a8_cta_existing_solution":
        raise A8DraftPlanningError("validation_plan_not_a8_cta")
    treatment=str(cta_context.get("treatment_solution_id") or "")
    control=str(cta_context.get("control_solution_id") or "")
    if treatment!=validation_plan.get("existing_solution_id"):
        raise A8DraftPlanningError("treatment_solution_must_match_validation_plan")
    if not control.startswith("sol_") or len(control)!=40:
        raise A8DraftPlanningError("invalid_control_solution_id")
    if not treatment.startswith("sol_") or len(treatment)!=40:
        raise A8DraftPlanningError("invalid_treatment_solution_id")
    if control==treatment:
        raise A8DraftPlanningError("control_and_treatment_must_differ")

    source_asset_id=str(cta_context.get("source_asset_id") or "")
    if not source_asset_id.startswith("ast_") or len(source_asset_id)!=40:
        raise A8DraftPlanningError("invalid_source_asset_id")
    cta_slot_key=str(cta_context.get("cta_slot_key") or "").strip()
    if not cta_slot_key or len(cta_slot_key)>160:
        raise A8DraftPlanningError("invalid_cta_slot_key")

    policy=load_a8_policy()
    min_exposures=int(policy["evaluation"]["min_exposures_default"])
    max_exposures=int(cta_context.get("max_exposures") or 0)
    if max_exposures < min_exposures:
        raise A8DraftPlanningError("max_exposures_below_policy_minimum")

    decision=select_a7_decision(
        a7_decisions,
        treatment_solution_id=treatment,
        explicit_decision_id=cta_context.get("a7_decision_id"),
    )
    rule_version_id=str(decision.get("rule_version_id") or "")
    if not rule_version_id.startswith("rul_") or len(rule_version_id)!=40:
        raise A8DraftPlanningError("invalid_a7_rule_version_id")

    split=policy["assignment"]["default_split"]
    control_bps=int(split["control"])
    treatment_bps=int(split["variant"])
    population={
        "source_asset_id":source_asset_id,
        "cta_slot_key":cta_slot_key,
    }
    territory=cta_context.get("territory_key")
    if territory:
        population["territory_key"]=str(territory)

    definition=Definition(
        hypothesis=str(validation_plan["hypothesis"]),
        eligible_population=population,
        primary_metric=str(validation_plan.get("primary_metric_key") or policy["metrics"]["default_primary"]),
        secondary_metrics=("cta_click_rate","conversion_rate"),
        stop_rules={
            "min_exposures":min_exposures,
            "max_exposures":max_exposures,
            "worse_guardrail_bps":int(policy["evaluation"]["worse_guardrail_bps"]),
        },
        success_criteria={
            "neutral_band_bps":int(policy["evaluation"]["neutral_band_bps"]),
        },
        compatibility_key=f"asset:{source_asset_id}:cta:{cta_slot_key}",
        variants=(
            Variant("control",control_bps,{"destination_solution_id":control}),
            Variant("variant_a",treatment_bps,{"destination_solution_id":treatment}),
        ),
        policy_version=str(policy["policy_version"]),
    )
    validate_definition(definition)

    identity={
        "validation_plan_id":validation_plan["validation_plan_id"],
        "decision_id":decision["decision_id"],
        "definition":{
            "hypothesis":definition.hypothesis,
            "eligible_population":definition.eligible_population,
            "primary_metric":definition.primary_metric,
            "secondary_metrics":definition.secondary_metrics,
            "stop_rules":definition.stop_rules,
            "success_criteria":definition.success_criteria,
            "compatibility_key":definition.compatibility_key,
            "variants":[
                {"key":v.key,"allocation_basis_points":v.allocation_basis_points,"payload":dict(v.payload)}
                for v in definition.variants
            ],
            "policy_version":definition.policy_version,
        },
    }
    experiment_id=_stable_id("exp_",identity)
    version_id=_stable_id("exv_",{"experiment_id":experiment_id,"version":1,"identity":identity})
    variants=[]
    for variant in definition.variants:
        payload=dict(variant.payload)
        variants.append({
            "experiment_variant_id":_stable_id("var_",{
                "experiment_version_id":version_id,
                "variant_key":variant.key,
                "payload":payload,
            }),
            "variant_key":variant.key,
            "allocation_basis_points":variant.allocation_basis_points,
            "variant_payload":payload,
            "payload_hash":_sha(payload),
        })

    evidence=sorted(set(
        list(validation_plan.get("evidence_refs",()))
        + list(decision.get("evidence_refs",()))
        + list(cta_context.get("evidence_refs",()))
    ))
    input_hash=_sha(identity)
    return {
        "schema":"maison.a8-draft.v1",
        "validation_plan_id":validation_plan["validation_plan_id"],
        "a7_decision_id":decision["decision_id"],
        "experiment":{
            "experiment_id":experiment_id,
            "experiment_key":f"a14-{experiment_id[4:]}",
            "created_by":"maison_brain_planner",
            "public_side_effects":False,
        },
        "version":{
            "experiment_version_id":version_id,
            "version_number":1,
            "decision_id":decision["decision_id"],
            "hypothesis":definition.hypothesis,
            "change_class":"cta_route_existing_solution",
            "eligible_population":dict(definition.eligible_population),
            "primary_metric_key":definition.primary_metric,
            "secondary_metrics":list(definition.secondary_metrics),
            "stop_rules":dict(definition.stop_rules),
            "success_criteria":dict(definition.success_criteria),
            "split":{"control":control_bps,"variant_a":treatment_bps},
            "compatibility_key":definition.compatibility_key,
            "policy_version":definition.policy_version,
            "rule_version_id":rule_version_id,
            "model_version_id":decision.get("model_version_id"),
            "input_hash":input_hash,
        },
        "variants":variants,
        "state":{
            "state_event_id":_stable_id("xst_",{"experiment_version_id":version_id,"to_state":"draft"}),
            "from_state":None,
            "to_state":"draft",
            "reason_code":"approved_validation_plan_drafted",
            "actor_kind":"system_simulation",
            "details":{
                "validation_plan_id":validation_plan["validation_plan_id"],
                "a7_decision_id":decision["decision_id"],
                "source_asset_id":source_asset_id,
                "cta_slot_key":cta_slot_key,
            },
        },
        "evidence_refs":evidence,
        "public_write_authorized":False,
        "experiment_execution_authorized":False,
    }
