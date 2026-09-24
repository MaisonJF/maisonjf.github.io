#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Mapping

from commercial_assets import CommercialAssetContext
from build_commercial_attention import load_attention
from commercial_economics import evaluate_asset


ROOT=Path(__file__).resolve().parent
REGISTRY=ROOT/"commercial-assets.generated.json"


def _next_action(row: Mapping[str,Any], economics: Mapping[str,Any]) -> tuple[str,str]:
    blockers=set(str(x) for x in economics.get("blockers",[]))
    asset_type=str(row.get("asset_type") or "")
    if economics.get("manual_validation_ready") is True:
        return "human_validation_review","Operational facts and unit economics are known; human review is the next gate."
    if "concrete_price_unknown" in blockers:
        return "select_concrete_price","A human must select or approve a concrete catalogue/quote price before economics can be evaluated."
    if asset_type=="physical_product":
        if "unit_cost_incomplete" in blockers:
            return "verify_unit_cost","Record material and packaging cost for this exact product."
        if "replenishment_capacity_incomplete" in blockers:
            return "verify_replenishment_capacity","Record production time and practical batch capacity; current finished stock is only a volatile snapshot."
    elif asset_type=="digital_product":
        if "delivery_effort_incomplete" in blockers:
            return "verify_digital_delivery_effort","Record per-sale human effort and delivery/lead time for this digital product; zero is valid only when verified."
        if "variable_cost_unknown" in blockers:
            return "verify_variable_cost","Record the variable cost for one delivered digital unit."
    else:
        if "capacity_incomplete" in blockers:
            return "verify_service_capacity","Record real service capacity and its period."
        if "delivery_effort_incomplete" in blockers:
            return "verify_delivery_effort","Record human effort and the realistic delivery/lead time."
        if "variable_cost_unknown" in blockers:
            return "verify_variable_cost","Record the variable cost for one delivered unit."
        if "delivery_lead_unknown" in blockers:
            return "verify_delivery_window","Record the realistic delivery/lead time."
    if not economics.get("unit_economics_known"):
        return "complete_unit_economics","Complete the remaining operational facts before judging profitability."
    return "human_review","Keep this item human-gated; no automatic commercial action is authorized."


def build_board(
    *,
    overlay_path: Path | None=None,
    selected_service_prices: Mapping[str,int] | None=None,
) -> dict[str,Any]:
    attention=load_attention()
    context=CommercialAssetContext.from_files(REGISTRY,overlay_path=overlay_path)
    selected_service_prices=dict(selected_service_prices or {})

    rows=[]
    for ranked in attention.get("assets",[]):
        if not isinstance(ranked,Mapping):
            continue
        ref=str(ranked.get("asset_ref") or "")
        asset_type=str(ranked.get("asset_type") or "")
        economics=evaluate_asset(
            context,
            ref,
            selected_price_minor=selected_service_prices.get(ref),
        )
        next_action,next_reason=_next_action(ranked,economics)
        asset_type=str(ranked.get("asset_type") or economics.get("asset_type") or "")
        commercial_state="needs_facts"
        if economics.get("manual_validation_ready") is True:
            commercial_state="ready_for_human_validation"
        elif asset_type=="physical_product" and economics.get("replenishment_capacity_known") is True:
            commercial_state="replenishable_needs_economics"

        rows.append({
            "attention_rank":ranked.get("attention_rank"),
            "asset_ref":ref,
            "name":ranked.get("name"),
            "asset_type":ranked.get("asset_type"),
            "attention_score":ranked.get("attention_score"),
            "attention_score_is_not_profit_score":True,
            "ocean_context":{
                "direct_territories":list(ranked.get("direct_ocean_territories",[])),
                "contextual_territories":[
                    x.get("territory") for x in ranked.get("contextual_ocean_matches",[])
                    if isinstance(x,Mapping) and x.get("territory")
                ],
            },
            "pricing":{
                "catalogue_price_minor":ranked.get("price_minor"),
                "price_label":ranked.get("price_label"),
                "selected_price_minor":selected_service_prices.get(ref),
                "price_resolution":economics.get("price_resolution"),
                "price_selection_required":economics.get("price_selection_required"),
            },
            "readiness":{
                "operational_facts_complete":economics.get("operational_facts_complete"),
                "unit_economics_known":economics.get("unit_economics_known"),
                "manual_validation_ready":economics.get("manual_validation_ready"),
                "blockers":list(economics.get("blockers",[])),
                "signals":list(economics.get("signals",[])),
            },
            "fulfilment":{
                "stock_snapshot_known":economics.get("stock_snapshot_known"),
                "available_units_at_observation":economics.get("available_units"),
                "stock_snapshot_is_readiness_gate":economics.get("stock_snapshot_is_readiness_gate"),
                "replenishment_capacity_known":economics.get("replenishment_capacity_known"),
                "production_minutes_per_unit":economics.get("production_minutes_per_unit"),
                "batch_capacity_units":economics.get("batch_capacity_units"),
            } if asset_type=="physical_product" else None,
            "commercial_state":commercial_state,
            "next_action":{
                "code":next_action,
                "reason":next_reason,
                "human_required":True,
            },
            "authority":{
                "public_write_authorized":False,
                "outbound_authorized":False,
                "spend_authorized":False,
                "stock_promise_authorized":False,
                "automatic_checkout_authorized":False,
                "experiment_execution_authorized":False,
            },
        })

    action_counts=Counter(x["next_action"]["code"] for x in rows)
    blocker_counts=Counter(
        blocker for row in rows for blocker in row["readiness"]["blockers"]
    )
    return {
        "schema_version":"commercial_readiness_board_v1",
        "kind":"maison_commercial_readiness_board",
        "mode":"analysis_only",
        "overlay_loaded":overlay_path is not None,
        "contract":{
            "attention_is_not_profit":True,
            "unknown_facts_remain_unknown":True,
            "catalogue_availability_is_not_inventory":True,
            "current_stock_is_volatile_snapshot_not_readiness_gate":True,
            "replenishment_capacity_is_structural_fulfilment_fact":True,
            "human_gate_required":True,
            "writes_performed":False,
        },
        "authority":{
            "public_write_authorized":False,
            "outbound_authorized":False,
            "spend_authorized":False,
            "stock_promise_authorized":False,
            "automatic_checkout_authorized":False,
            "experiment_execution_authorized":False,
        },
        "summary":{
            "assets":len(rows),
            "manual_validation_ready":sum(bool(x["readiness"]["manual_validation_ready"]) for x in rows),
            "unit_economics_known":sum(bool(x["readiness"]["unit_economics_known"]) for x in rows),
            "operational_facts_complete":sum(bool(x["readiness"]["operational_facts_complete"]) for x in rows),
            "ready_for_human_validation":sum(x["commercial_state"]=="ready_for_human_validation" for x in rows),
            "replenishable_needs_economics":sum(x["commercial_state"]=="replenishable_needs_economics" for x in rows),
            "next_action_counts":dict(sorted(action_counts.items())),
            "blocker_counts":dict(sorted(blocker_counts.items())),
        },
        "rows":rows,
    }


def main() -> None:
    parser=argparse.ArgumentParser(description="Offline Maison commercial readiness board.")
    parser.add_argument("--overlay",type=Path)
    parser.add_argument("--service-price",action="append",default=[],metavar="ASSET_REF=MINOR")
    args=parser.parse_args()
    prices={}
    for raw in args.service_price:
        if "=" not in raw:
            raise SystemExit("--service-price must be ASSET_REF=MINOR")
        ref,value=raw.rsplit("=",1)
        try:
            prices[ref.strip()]=int(value)
        except ValueError as exc:
            raise SystemExit("--service-price amount must be an integer in minor units") from exc
    print(json.dumps(build_board(overlay_path=args.overlay,selected_service_prices=prices),ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
