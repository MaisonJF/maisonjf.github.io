#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from commercial_assets import CommercialAssetContext
from commercial_economics import evaluate_asset, evaluate_bundle


ROOT=Path(__file__).resolve().parent
REGISTRY=ROOT/"commercial-assets.generated.json"
ATTENTION=ROOT/"commercial-attention.generated.json"
BUNDLES=ROOT/"commercial-bundles.generated.json"


def build_report(
    *,
    overlay_path: Path | None=None,
    selected_service_prices: dict[str,int] | None=None,
) -> dict[str,Any]:
    registry=json.loads(REGISTRY.read_text(encoding="utf-8"))
    attention=json.loads(ATTENTION.read_text(encoding="utf-8"))
    bundles=json.loads(BUNDLES.read_text(encoding="utf-8"))
    context=CommercialAssetContext.from_files(REGISTRY,overlay_path=overlay_path)
    selected_service_prices=selected_service_prices or {}

    rows=[]
    for ranked in attention.get("assets",[]):
        ref=str(ranked["asset_ref"])
        economics=evaluate_asset(
            context,
            ref,
            selected_price_minor=selected_service_prices.get(ref),
        )
        rows.append({
            "attention_rank":ranked["attention_rank"],
            "asset_ref":ref,
            "name":ranked["name"],
            "asset_type":ranked["asset_type"],
            "attention_score":ranked["attention_score"],
            "attention_score_is_not_profit_score":True,
            "ocean_territory_count":len(ranked.get("direct_ocean_territories",[]))
                + len(ranked.get("contextual_ocean_matches",[])),
            "operational_facts_complete":economics["operational_facts_complete"],
            "unit_economics_known":economics["unit_economics_known"],
            "manual_validation_ready":economics["manual_validation_ready"],
            "blockers":economics["blockers"],
            "economics":{
                "price_minor":economics.get("price_minor"),
                "unit_cost_minor":economics.get("unit_cost_minor"),
                "variable_cost_minor":economics.get("variable_cost_minor"),
                "unit_contribution_minor":economics.get("unit_contribution_minor"),
                "contribution_margin_bps":economics.get("contribution_margin_bps"),
                "production_minutes_per_unit":economics.get("production_minutes_per_unit"),
                "human_effort_minutes":economics.get("human_effort_minutes"),
                "contribution_per_production_minute_minor":(
                    round(economics["unit_contribution_minor"] / economics["production_minutes_per_unit"],2)
                    if isinstance(economics.get("unit_contribution_minor"),int)
                    and isinstance(economics.get("production_minutes_per_unit"),int)
                    and economics["production_minutes_per_unit"] > 0
                    else None
                ),
                "contribution_per_human_minute_minor":(
                    round(economics["unit_contribution_minor"] / economics["human_effort_minutes"],2)
                    if isinstance(economics.get("unit_contribution_minor"),int)
                    and isinstance(economics.get("human_effort_minutes"),int)
                    and economics["human_effort_minutes"] > 0
                    else None
                ),
                "evidence_refs":list(economics.get("operational_evidence_refs",[])),
            },
        })

    bundle_rows=[]
    by_id={x["bundle_id"]:x for x in bundles.get("bundles",[])}
    for bundle_id in sorted(by_id):
        result=evaluate_bundle(bundle=by_id[bundle_id],context=context)
        bundle_rows.append({
            "bundle_id":bundle_id,
            "label":result["label"],
            "catalogue_subtotal_minor":result["catalogue_subtotal_minor"],
            "available_bundle_units":result["available_bundle_units"],
            "stock_snapshot_is_readiness_gate":result["stock_snapshot_is_readiness_gate"],
            "replenishment_capacity_known":result["replenishment_capacity_known"],
            "replenishment_batch_units":result["replenishment_batch_units"],
            "production_minutes_per_bundle":result["production_minutes_per_bundle"],
            "combined_unit_cost_minor":result["combined_unit_cost_minor"],
            "human_price_supplied":False,
            "manual_validation_ready":result["manual_validation_ready"],
            "blockers":result["blockers"],
        })

    return {
        "kind":"maison_commercial_operator_readiness",
        "overlay_loaded":overlay_path is not None,
        "attention_score_is_not_profit_score":True,
        "economics_contract":{
            "economics_are_separate_from_attention":True,
            "unknown_economics_remain_null":True,
            "private_overlay_values_are_not_persisted":True,
            "no_automatic_profit_ranking":True,
            "human_commercial_judgement_required":True,
        },
        "authority":{
            "public_write_authorized":False,
            "stock_promise_authorized":False,
            "automatic_checkout_authorized":False,
            "experiment_execution_authorized":False,
        },
        "summary":{
            "ranked_assets":len(rows),
            "operationally_complete_assets":sum(x["operational_facts_complete"] for x in rows),
            "unit_economics_known_assets":sum(x["unit_economics_known"] for x in rows),
            "manual_validation_ready_assets":sum(x["manual_validation_ready"] for x in rows),
            "bundle_hypotheses":len(bundle_rows),
            "bundle_manual_validation_ready":sum(x["manual_validation_ready"] for x in bundle_rows),
        },
        "attention":rows,
        "bundles":bundle_rows,
    }


def main() -> None:
    parser=argparse.ArgumentParser(description="Private operator-side commercial readiness report.")
    parser.add_argument("--overlay",type=Path)
    parser.add_argument("--bundle-id")
    parser.add_argument("--proposed-price-minor",type=int)
    parser.add_argument(
        "--service-price",
        action="append",
        default=[],
        metavar="ASSET_REF=MINOR",
        help="Human-selected concrete service price. Repeatable.",
    )
    args=parser.parse_args()

    selected_service_prices={}
    for raw in args.service_price:
        if "=" not in raw:
            raise SystemExit("--service-price must be ASSET_REF=MINOR")
        ref,value=raw.rsplit("=",1)
        try:
            amount=int(value)
        except ValueError as exc:
            raise SystemExit("--service-price amount must be an integer in minor units") from exc
        selected_service_prices[ref.strip()]=amount

    report=build_report(
        overlay_path=args.overlay,
        selected_service_prices=selected_service_prices,
    )

    if args.bundle_id:
        bundles=json.loads(BUNDLES.read_text(encoding="utf-8"))
        by_id={x["bundle_id"]:x for x in bundles.get("bundles",[])}
        if args.bundle_id not in by_id:
            raise SystemExit("unknown bundle id")
        context=CommercialAssetContext.from_files(REGISTRY,overlay_path=args.overlay)
        report["bundle_price_evaluation"]=evaluate_bundle(
            bundle=by_id[args.bundle_id],
            context=context,
            proposed_price_minor=args.proposed_price_minor,
        )
    elif args.proposed_price_minor is not None:
        raise SystemExit("--proposed-price-minor requires --bundle-id")

    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
