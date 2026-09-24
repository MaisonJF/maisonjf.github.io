#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping


class ManualPilotContextError(ValueError):
    pass


STRING_INPUTS={
    "target_profile",
    "capacity_basis",
    "price_or_quote_rule",
    "amplifier_or_partner_ref",
    "activation_strategy",
    "attribution_method",
    "purchase_behaviour",
    "pilot_scope",
    "cost_basis",
    "explicit_new_offer_decision_ref",
}
INTEGER_INPUTS={
    "unit_or_project_cost_minor",
    "fulfilment_lead_time_days",
    "direct_cost_minor",
}
ALLOWED_INPUTS=STRING_INPUTS | INTEGER_INPUTS


def _validate_inputs(raw: object) -> dict[str,Any]:
    if not isinstance(raw,Mapping):
        raise ManualPilotContextError("manual_pilot_inputs_must_be_object")
    extra=set(raw)-ALLOWED_INPUTS
    if extra:
        raise ManualPilotContextError(
            "manual_pilot_context_unknown_inputs:"+",".join(sorted(map(str,extra)))
        )
    if not raw:
        raise ManualPilotContextError("manual_pilot_context_inputs_required")

    out={}
    for key,value in raw.items():
        if key in STRING_INPUTS:
            if not isinstance(value,str) or not value.strip():
                raise ManualPilotContextError(f"{key}:non_empty_string_required")
            if len(value.strip())>2000:
                raise ManualPilotContextError(f"{key}:too_long")
            out[key]=value.strip()
            continue
        if isinstance(value,bool) or not isinstance(value,int) or value<0:
            raise ManualPilotContextError(f"{key}:non_negative_integer_required")
        out[key]=value
    return out


def load_manual_pilot_context(path: Path) -> dict[str,dict[str,Any]]:
    raw=json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw,Mapping):
        raise ManualPilotContextError("manual_pilot_context_root_must_be_object")
    if raw.get("schema_version")!="manual_pilot_context_v1":
        raise ManualPilotContextError("unsupported_manual_pilot_context_schema")
    observed_at=raw.get("observed_at")
    if not isinstance(observed_at,str) or not observed_at.strip():
        raise ManualPilotContextError("manual_pilot_context_observed_at_required")
    rows=raw.get("contexts")
    if not isinstance(rows,list):
        raise ManualPilotContextError("manual_pilot_contexts_must_be_array")

    allowed_row={"validation_plan_id","inputs","evidence_refs"}
    out={}
    for row in rows:
        if not isinstance(row,Mapping):
            raise ManualPilotContextError("manual_pilot_context_row_must_be_object")
        extra=set(row)-allowed_row
        if extra:
            raise ManualPilotContextError(
                "manual_pilot_context_unknown_fields:"+",".join(sorted(map(str,extra)))
            )
        plan_id=str(row.get("validation_plan_id") or "")
        if not plan_id.startswith("vpl_") or len(plan_id)!=40:
            raise ManualPilotContextError("invalid_manual_pilot_context_validation_plan_id")
        if plan_id in out:
            raise ManualPilotContextError("duplicate_manual_pilot_context_validation_plan_id")

        refs=row.get("evidence_refs")
        if (
            not isinstance(refs,list)
            or not refs
            or not all(isinstance(x,str) and x.strip() for x in refs)
        ):
            raise ManualPilotContextError("manual_pilot_context_evidence_refs_required")

        inputs=_validate_inputs(row.get("inputs"))
        out[plan_id]={
            "inputs":inputs,
            "evidence_refs":tuple(dict.fromkeys(x.strip() for x in refs)),
        }
    return out
