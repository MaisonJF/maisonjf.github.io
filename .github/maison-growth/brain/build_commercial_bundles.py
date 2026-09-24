#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping


ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/"commercial-bundles.source.json"
ASSETS=ROOT/"commercial-assets.generated.json"
OUTPUT=ROOT/"commercial-bundles.generated.json"


def build_payload(
    source: Mapping[str,Any],
    registry: Mapping[str,Any],
) -> dict[str,Any]:
    if source.get("schema_version")!="commercial_bundle_hypotheses_source_v1":
        raise ValueError("unsupported_bundle_source_schema")
    assets_raw=registry.get("assets",[])
    if not isinstance(assets_raw,list):
        raise ValueError("commercial_assets_must_be_array")
    assets={
        str(row.get("asset_ref")):dict(row)
        for row in assets_raw
        if isinstance(row,Mapping) and row.get("asset_ref")
    }

    out=[]
    seen=set()
    for raw in source.get("bundles",[]):
        if not isinstance(raw,Mapping):
            raise ValueError("bundle_must_be_object")
        bundle_id=str(raw.get("bundle_id") or "").strip()
        if not bundle_id or bundle_id in seen:
            raise ValueError("bundle_id_missing_or_duplicate")
        seen.add(bundle_id)
        refs=raw.get("asset_refs",[])
        if not isinstance(refs,list) or len(refs)<2:
            raise ValueError(f"bundle_requires_multiple_assets:{bundle_id}")

        selected=[]
        for ref in refs:
            key=str(ref)
            asset=assets.get(key)
            if asset is None:
                raise ValueError(f"unknown_bundle_asset:{bundle_id}:{key}")
            if asset.get("asset_type")!="physical_product":
                raise ValueError(f"bundle_asset_must_be_physical:{bundle_id}:{key}")
            if asset.get("lifecycle_status")!="active":
                raise ValueError(f"bundle_asset_must_be_active:{bundle_id}:{key}")
            if asset.get("public") is not True:
                raise ValueError(f"bundle_asset_must_be_public:{bundle_id}:{key}")
            selected.append(asset)

        currencies={str(x.get("currency") or "") for x in selected}
        if currencies!={"EUR"}:
            raise ValueError(f"bundle_assets_must_be_eur:{bundle_id}")

        prices=[x.get("price_minor") for x in selected]
        subtotal=sum(int(x) for x in prices if isinstance(x,int))
        price_complete=len(prices)==len(selected) and all(isinstance(x,int) for x in prices)

        replenishment_known=all(
            isinstance(x.get("operational",{}).get("production_minutes_per_unit"),int)
            and isinstance(x.get("operational",{}).get("batch_capacity_units"),int)
            and x.get("operational",{}).get("batch_capacity_units") > 0
            for x in selected
        )
        unit_cost_known=all(
            isinstance(x.get("operational",{}).get("unit_material_cost_minor"),int)
            and isinstance(x.get("operational",{}).get("packaging_cost_minor"),int)
            for x in selected
        )

        out.append({
            "bundle_id":bundle_id,
            "label":str(raw.get("label") or bundle_id),
            "purpose":str(raw.get("purpose") or ""),
            "status":"draft_hypothesis",
            "asset_refs":[str(x) for x in refs],
            "assets":[{
                "asset_ref":str(x["asset_ref"]),
                "name":str(x.get("name") or ""),
                "sku":x.get("sku"),
                "price_minor":x.get("price_minor"),
                "currency":x.get("currency"),
            } for x in selected],
            "ocean_territories":[str(x) for x in raw.get("ocean_territories",[]) if str(x).strip()],
            "catalogue_subtotal_minor":subtotal if price_complete else None,
            "currency":"EUR" if price_complete else None,
            "bundle_price_minor":None,
            "operational_readiness":{
                "current_stock_snapshot_required":False,
                "stock_snapshot_is_readiness_gate":False,
                "replenishment_capacity_known":replenishment_known,
                "replenishment_check_required":not replenishment_known,
                "unit_cost_known":unit_cost_known,
                "margin_check_required":not unit_cost_known,
            },
            "authority":{
                "public_write_authorized":False,
                "automatic_checkout_authorized":False,
                "human_approval_required":True,
            },
            "reason_codes":[
                "internal_bundle_hypothesis",
                "catalogue_subtotal_not_offer_price",
                "current_stock_is_volatile_snapshot",
                *([] if replenishment_known else ["replenishment_capacity_unknown"]),
                *([] if unit_cost_known else ["unit_cost_unknown"]),
            ],
        })

    return {
        "schema_version":"commercial_bundle_hypotheses_v1",
        "source":"commercial-bundles.source.json",
        "asset_source":"commercial-assets.generated.json",
        "contract":dict(source.get("contract",{})),
        "summary":{
            "bundle_count":len(out),
            "ready_for_publication":0,
            "requires_stock_check":0,
            "requires_replenishment_check":sum(1 for x in out if x["operational_readiness"]["replenishment_check_required"]),
            "requires_margin_check":sum(1 for x in out if x["operational_readiness"]["margin_check_required"]),
        },
        "bundles":out,
    }


def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()

    payload=build_payload(
        json.loads(SOURCE.read_text(encoding="utf-8")),
        json.loads(ASSETS.read_text(encoding="utf-8")),
    )
    rendered=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
    if args.check:
        current=OUTPUT.read_text(encoding="utf-8")
        if current!=rendered:
            raise SystemExit("commercial-bundles.generated.json is stale; run build_commercial_bundles.py")
        print(f"Commercial bundle hypotheses: OK · {payload['summary']['bundle_count']} drafts")
        return
    OUTPUT.write_text(rendered,encoding="utf-8")
    print(f"Wrote {payload['summary']['bundle_count']} bundle hypotheses")


if __name__=="__main__":
    main()
