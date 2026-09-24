#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
from typing import Any
from commercial_assets import CommercialAssetContext
from commercial_economics import evaluate_asset

ROOT=Path(__file__).resolve().parent
REGISTRY=ROOT/"commercial-assets.generated.json"

def build_summary(*,overlay_path:Path|None=None)->dict[str,Any]:
    ctx=CommercialAssetContext.from_files(REGISTRY,overlay_path=overlay_path)
    rows=[]
    for ref in sorted(ctx.assets):
        snap=ctx.operational_snapshot(ref)
        econ=evaluate_asset(ctx,ref)
        if snap["asset_type"]!="physical_product":
            continue
        op=snap["operational"]
        structural=("unit_material_cost_minor","packaging_cost_minor","production_minutes_per_unit","batch_capacity_units")
        snapshot=("inventory_quantity","reserved_quantity")
        rows.append({
            "asset_ref":ref,"name":snap["name"],
            "structural_known_fields":[k for k in structural if op.get(k) is not None],
            "structural_missing_fields":[k for k in structural if op.get(k) is None],
            "stock_snapshot_known_fields":[k for k in snapshot if op.get(k) is not None],
            "stock_snapshot_is_readiness_gate":False,
            "unit_economics_known":econ["unit_economics_known"],
            "replenishment_capacity_known":econ["replenishment_capacity_known"],
            "manual_validation_ready":econ["manual_validation_ready"],
            "evidence_ref_count":len(econ.get("operational_evidence_refs",[])),
        })
    return {
        "kind":"maison_commercial_operations_fact_summary",
        "mode":"field_presence_only",
        "private_values_exposed":False,
        "contract":{
            "structural_physical_facts_are_cost_and_replenishment":True,
            "finished_stock_is_optional_snapshot":True,
            "unknowns_remain_unknown":True,
            "writes_performed":False,
            "execution_authority":False,
        },
        "summary":{
            "physical_assets":len(rows),
            "structurally_complete":sum(not r["structural_missing_fields"] for r in rows),
            "unit_economics_known":sum(r["unit_economics_known"] for r in rows),
            "replenishment_capacity_known":sum(r["replenishment_capacity_known"] for r in rows),
            "manual_validation_ready":sum(r["manual_validation_ready"] for r in rows),
        },
        "assets":rows,
    }

def main()->None:
    p=argparse.ArgumentParser(description="Names/field-presence-only summary of private physical operations facts.")
    p.add_argument("--overlay",type=Path)
    a=p.parse_args()
    print(json.dumps(build_summary(overlay_path=a.overlay),ensure_ascii=False,indent=2))
if __name__=="__main__": main()
