#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping

from commercial_readiness_board import build_board


ROOT=Path(__file__).resolve().parent

ACTION_FIELDS={
    "verify_unit_cost":[
        ("unit_material_cost_minor","What is the material cost for one unit, in euro cents?"),
        ("packaging_cost_minor","What is the packaging cost for one unit, in euro cents?"),
    ],
    "verify_replenishment_capacity":[
        ("production_minutes_per_unit","How many production minutes does one unit require?"),
        ("batch_capacity_units","How many units can one practical batch produce?"),
    ],
    "verify_service_capacity":[
        ("capacity_units_per_period","How many units/sessions can realistically be delivered in one period?"),
        ("capacity_period","What is that period (for example week or month)?"),
    ],
    "verify_delivery_effort":[
        ("human_effort_minutes","How many human minutes does one delivered unit require?"),
        ("delivery_lead_days","What is the realistic delivery lead time in days?"),
    ],
    "verify_digital_delivery_effort":[
        ("human_effort_minutes","How many human minutes does one delivered digital unit require? Use zero only when verified."),
        ("delivery_lead_days","What is the observed delivery lead time in days for one digital unit? Use zero only when verified."),
    ],
    "verify_variable_cost":[
        ("variable_cost_minor","What is the variable cost of one delivered unit, in euro cents?"),
    ],
    "select_concrete_price":[
        ("selected_price_minor","Which concrete catalogue option or human-approved quote should be evaluated, in euro cents?"),
    ],
    "complete_unit_economics":[],
    "human_validation_review":[],
    "human_review":[],
}


def build_plan(*, overlay_path: Path | None=None) -> dict[str,Any]:
    board=build_board(overlay_path=overlay_path)
    tasks=[]
    for row in board["rows"]:
        action=row["next_action"]["code"]
        fields=ACTION_FIELDS.get(action,[])
        if not fields:
            continue
        tasks.append({
            "priority":len(tasks)+1,
            "attention_rank":row["attention_rank"],
            "asset_ref":row["asset_ref"],
            "name":row["name"],
            "asset_type":row["asset_type"],
            "next_action":action,
            "fields":[{
                "field":field,
                "question":question,
                "value":None,
                "evidence_ref":None,
            } for field,question in fields],
            "rules":{
                "unknown_may_remain_null":True,
                "evidence_required_for_known_value":True,
                "catalogue_availability_is_not_counted_inventory":True,
                "current_stock_snapshot_is_optional_and_volatile":True,
                "replenishment_capacity_is_structural":True,
            },
        })
    return {
        "schema_version":"commercial_fact_collection_plan_v1",
        "kind":"maison_commercial_fact_collection_plan",
        "mode":"operator_input_template",
        "source":"commercial_readiness_board_v1",
        "contract":{
            "contains_private_values":False,
            "unknowns_are_not_guessed":True,
            "attention_is_prioritization_context_not_profit":True,
            "writes_performed":False,
            "execution_authority":False,
        },
        "summary":{
            "tasks":len(tasks),
            "fields_to_collect":sum(len(x["fields"]) for x in tasks),
            "assets_already_past_collection_gate":sum(
                x["next_action"]["code"] in {"human_validation_review","human_review"}
                for x in board["rows"]
            ),
        },
        "tasks":tasks,
    }


def main() -> None:
    parser=argparse.ArgumentParser(description="Generate a zero-private-data fact collection plan from the readiness board.")
    parser.add_argument("--overlay",type=Path)
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    payload=build_plan(overlay_path=args.overlay)
    rendered=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
    if args.output:
        args.output.write_text(rendered,encoding="utf-8")
        print(f"Wrote {payload['summary']['tasks']} fact-collection tasks")
    else:
        print(rendered,end="")


if __name__=="__main__":
    main()
