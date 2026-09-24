#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from commercial_assets import CommercialAssetContext
from commercial_economics import evaluate_bundle

ROOT=Path(__file__).resolve().parent
REGISTRY=ROOT/"commercial-assets.generated.json"
BUNDLES=ROOT/"commercial-bundles.generated.json"


def build_preview(
    bundle_id:str,
    *,
    overlay_path:Path|None=None,
    proposed_price_minor:int|None=None,
)->dict[str,Any]:
    payload=json.loads(BUNDLES.read_text(encoding="utf-8"))
    by_id={str(row["bundle_id"]):row for row in payload.get("bundles",[]) if isinstance(row,dict)}
    if bundle_id not in by_id:
        raise ValueError("unknown_bundle_id")

    context=CommercialAssetContext.from_files(REGISTRY,overlay_path=overlay_path)
    economics=evaluate_bundle(
        bundle=by_id[bundle_id],
        context=context,
        proposed_price_minor=proposed_price_minor,
    )

    structural_ready=(
        economics["replenishment_capacity_known"] is True
        and economics["combined_unit_cost_minor"] is not None
    )
    if not structural_ready:
        state="needs_operational_facts"
        next_gate="verify_cost_and_replenishment"
    elif proposed_price_minor is None:
        state="needs_human_price"
        next_gate="human_price_selection_at_or_above_catalogue_subtotal"
    elif economics["manual_validation_ready"]:
        state="ready_for_human_validation_review"
        next_gate="human_validation_review"
    else:
        state="blocked"
        next_gate="human_review"

    return {
        "kind":"maison_bundle_validation_preview",
        "mode":"private_operator_preview",
        "bundle_id":bundle_id,
        "label":economics["label"],
        "state":state,
        "next_gate":next_gate,
        "catalogue_subtotal_minor":economics["catalogue_subtotal_minor"],
        "bundle_price_floor_minor":economics["bundle_price_floor_minor"],
        "proposed_price_minor":economics["proposed_price_minor"],
        "combined_unit_cost_minor":economics["combined_unit_cost_minor"],
        "unit_contribution_minor":economics["unit_contribution_minor"],
        "contribution_margin_bps":economics["contribution_margin_bps"],
        "replenishment_capacity_known":economics["replenishment_capacity_known"],
        "replenishment_batch_units":economics["replenishment_batch_units"],
        "production_minutes_per_bundle":economics["production_minutes_per_bundle"],
        "stock_snapshot_known":economics["stock_snapshot_known"],
        "stock_snapshot_is_readiness_gate":False,
        "signals":list(economics["signals"]),
        "blockers":list(economics["blockers"]),
        "operational_evidence_refs":list(economics.get("operational_evidence_refs",[])),
        "contract":{
            "bundle_price_selected_by_system":False,
            "catalogue_subtotal_is_price_floor":True,
            "value_growth_comes_from_composition_not_price_reduction":True,
            "human_validation_required":True,
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
    }


def main()->None:
    parser=argparse.ArgumentParser(description="Private, read-only bundle validation preview.")
    parser.add_argument("bundle_id")
    parser.add_argument("--overlay",type=Path)
    parser.add_argument("--proposed-price-minor",type=int)
    args=parser.parse_args()
    print(json.dumps(
        build_preview(
            args.bundle_id,
            overlay_path=args.overlay,
            proposed_price_minor=args.proposed_price_minor,
        ),
        ensure_ascii=False,
        indent=2,
    ))


if __name__=="__main__":
    main()
