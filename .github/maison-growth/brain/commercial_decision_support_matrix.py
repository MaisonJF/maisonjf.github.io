#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping

from commercial_operator_report import build_report


def _dimension_state(value: Any) -> str:
    return "known" if value is not None else "unknown"


def build_matrix(
    *,
    overlay_path: Path | None=None,
    selected_service_prices: Mapping[str,int] | None=None,
    include_private_values: bool=False,
) -> dict[str,Any]:
    report=build_report(
        overlay_path=overlay_path,
        selected_service_prices=dict(selected_service_prices or {}),
    )
    rows=[]
    for source in report.get("attention",[]):
        economics=dict(source.get("economics",{}))
        row={
            "attention_rank":source.get("attention_rank"),
            "asset_ref":source.get("asset_ref"),
            "name":source.get("name"),
            "asset_type":source.get("asset_type"),
            "attention":{
                "score":source.get("attention_score"),
                "ocean_territory_count":source.get("ocean_territory_count"),
                "is_profit_score":False,
            },
            "readiness":{
                "operational_facts_complete":source.get("operational_facts_complete"),
                "unit_economics_known":source.get("unit_economics_known"),
                "manual_validation_ready":source.get("manual_validation_ready"),
                "blockers":list(source.get("blockers",[])),
            },
            "economic_dimensions":{
                "price":_dimension_state(economics.get("price_minor")),
                "unit_cost":_dimension_state(
                    economics.get("unit_cost_minor")
                    if economics.get("unit_cost_minor") is not None
                    else economics.get("variable_cost_minor")
                ),
                "unit_contribution":_dimension_state(economics.get("unit_contribution_minor")),
                "contribution_margin":_dimension_state(economics.get("contribution_margin_bps")),
                "production_efficiency":_dimension_state(
                    economics.get("contribution_per_production_minute_minor")
                ),
                "human_effort_efficiency":_dimension_state(
                    economics.get("contribution_per_human_minute_minor")
                ),
                "evidence_backed":bool(economics.get("evidence_refs")),
            },
        }
        if include_private_values:
            row["private_economics"]={
                "price_minor":economics.get("price_minor"),
                "unit_cost_minor":economics.get("unit_cost_minor"),
                "variable_cost_minor":economics.get("variable_cost_minor"),
                "unit_contribution_minor":economics.get("unit_contribution_minor"),
                "contribution_margin_bps":economics.get("contribution_margin_bps"),
                "contribution_per_production_minute_minor":economics.get(
                    "contribution_per_production_minute_minor"
                ),
                "contribution_per_human_minute_minor":economics.get(
                    "contribution_per_human_minute_minor"
                ),
                "evidence_refs":list(economics.get("evidence_refs",[])),
            }
        rows.append(row)

    return {
        "kind":"maison_commercial_decision_support_matrix",
        "mode":"human_decision_support_only",
        "overlay_loaded":report.get("overlay_loaded",False),
        "private_values_included":include_private_values,
        "contract":{
            "preserves_attention_order":True,
            "attention_and_economics_are_separate_dimensions":True,
            "no_combined_score":True,
            "no_profit_ranking":True,
            "no_recommended_winner":True,
            "unknowns_remain_unknown":True,
            "human_commercial_judgement_required":True,
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
            "economics_known":sum(bool(x["readiness"]["unit_economics_known"]) for x in rows),
            "manual_validation_ready":sum(bool(x["readiness"]["manual_validation_ready"]) for x in rows),
            "private_value_rows":sum("private_economics" in x for x in rows),
        },
        "rows":rows,
    }


def _parse_prices(raw_values: list[str]) -> dict[str,int]:
    prices={}
    for raw in raw_values:
        if "=" not in raw:
            raise ValueError("service_price_must_be_ASSET_REF=MINOR")
        ref,value=raw.rsplit("=",1)
        ref=ref.strip()
        if not ref:
            raise ValueError("service_price_asset_ref_required")
        try:
            amount=int(value)
        except ValueError as exc:
            raise ValueError("service_price_minor_must_be_integer") from exc
        if amount <= 0:
            raise ValueError("service_price_minor_must_be_positive")
        prices[ref]=amount
    return prices


def main() -> None:
    parser=argparse.ArgumentParser(
        description="Human-only Maison commercial decision-support matrix; never selects a winner."
    )
    parser.add_argument("--overlay",type=Path)
    parser.add_argument("--service-price",action="append",default=[],metavar="ASSET_REF=MINOR")
    parser.add_argument(
        "--full-private-values",
        action="store_true",
        help="Include private economics in local output. Default output contains only known/unknown states.",
    )
    args=parser.parse_args()
    if args.full_private_values and args.overlay is None:
        raise SystemExit("--full-private-values requires --overlay")
    try:
        prices=_parse_prices(args.service_price)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    payload=build_matrix(
        overlay_path=args.overlay,
        selected_service_prices=prices,
        include_private_values=args.full_private_values,
    )
    print(json.dumps(payload,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
