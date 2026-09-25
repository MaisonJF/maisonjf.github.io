#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from typing import Any, Mapping

from build_commercial_attention import load_attention
from digital_experience_coverage import load_coverage
from ocean_universal_coverage import build_contract as build_universal_coverage


def _contextual_by_territory(row: Mapping[str,Any]) -> dict[str,float]:
    out={}
    for item in row.get("contextual_ocean_matches",[]):
        if not isinstance(item,Mapping):
            continue
        territory=str(item.get("territory") or "").strip()
        score=item.get("score")
        if territory and isinstance(score,(int,float)):
            out[territory]=float(score)
    return out


def build_ocean_matrix() -> dict[str,Any]:
    attention=load_attention()
    digital=load_coverage()

    digital_by_territory={
        str(row.get("territory")):row
        for row in digital.get("oceans",[])
        if isinstance(row,Mapping) and row.get("territory")
    }
    universal=build_universal_coverage()
    territories=sorted(str(x) for x in universal.get("ocean_ids",[]) if str(x).strip())
    if not territories:
        # Backward-safe fallback for an older contract shape during local development.
        territories=sorted(digital_by_territory)

    asset_rows=[
        row for row in attention.get("assets",[])
        if isinstance(row,Mapping)
    ]

    rows=[]
    for territory in territories:
        relations=[]
        for asset in asset_rows:
            direct=territory in asset.get("direct_ocean_territories",[])
            contextual=_contextual_by_territory(asset).get(territory)
            if not direct and contextual is None:
                continue
            price=asset.get("price_minor")
            if isinstance(price,int):
                price_band=(
                    "low" if price<=1500
                    else "mid" if price<=5000
                    else "high"
                )
            else:
                price_band="unknown_or_variable"
            relations.append({
                "asset_ref":asset.get("asset_ref"),
                "name":asset.get("name"),
                "asset_type":asset.get("asset_type"),
                "price_minor":price,
                "price_label":asset.get("price_label"),
                "price_band":price_band,
                "match_kind":"direct" if direct else "contextual",
                "contextual_score":contextual,
                "attention_score":asset.get("attention_score"),
                "attention_score_is_not_profit_score":True,
                "execution_authority":False,
            })

        relations.sort(key=lambda x:(
            0 if x["match_kind"]=="direct" else 1,
            -(x["contextual_score"] or 0),
            x["price_minor"] if isinstance(x["price_minor"],int) else 10**12,
            str(x["asset_ref"]),
        ))

        types={str(x["asset_type"]) for x in relations}
        fixed_low=any(
            x["price_band"]=="low" and isinstance(x["price_minor"],int)
            for x in relations
        )
        d=digital_by_territory.get(territory,{})
        gaps=[]
        if "physical_product" not in types:
            gaps.append("no_physical_match")
        if not ({"service","b2b_service"} & types):
            gaps.append("no_service_match")
        if not fixed_low:
            gaps.append("no_fixed_low_ticket_match")

        rows.append({
            "territory":territory,
            "digital_feeds":{
                "pdi_eligible":bool(d.get("pdi",{}).get("eligible")),
                "pdi_theme_hypotheses":int(d.get("pdi",{}).get("theme_hypotheses") or 0),
                "pdi_stage_slots":int(d.get("pdi",{}).get("stage_slots") or 0),
                "oracle_eligible":bool(d.get("oracle",{}).get("eligible")),
                "oracle_role_slots":int(d.get("oracle",{}).get("role_slots") or 0),
            },
            "commercial_matches":relations,
            "coverage":{
                "matched_assets":len(relations),
                "asset_types":sorted(types),
                "fixed_low_ticket_match":fixed_low,
            },
            "structural_gaps":gaps,
        })

    return {
        "schema_version":"commercial_ocean_matrix_v1",
        "kind":"maison_ocean_commercial_matrix",
        "mode":"analysis_only",
        "contract":{
            "derived_at_read_time":True,
            "ocean_metadata_is_context_not_external_evidence":True,
            "attention_score_is_not_profit_score":True,
            "feed_eligibility_is_not_commercial_demand":True,
            "structural_gaps_are_not_product_launch_recommendations":True,
            "automatic_publication":False,
            "automatic_checkout":False,
            "execution_authority":False,
        },
        "summary":{
            "oceans":len(rows),
            "oceans_with_commercial_matches":sum(bool(x["commercial_matches"]) for x in rows),
            "oceans_with_physical_match":sum("physical_product" in x["coverage"]["asset_types"] for x in rows),
            "oceans_with_service_match":sum(bool({"service","b2b_service"} & set(x["coverage"]["asset_types"])) for x in rows),
            "oceans_with_fixed_low_ticket_match":sum(x["coverage"]["fixed_low_ticket_match"] for x in rows),
            "pdi_feed_oceans":sum(x["digital_feeds"]["pdi_eligible"] for x in rows),
            "oracle_feed_oceans":sum(x["digital_feeds"]["oracle_eligible"] for x in rows),
        },
        "oceans":rows,
    }


def main() -> None:
    parser=argparse.ArgumentParser(description="Read-time Ocean × commercial asset matrix.")
    parser.add_argument("--territory")
    args=parser.parse_args()
    payload=build_ocean_matrix()
    if args.territory:
        rows=[x for x in payload["oceans"] if x["territory"]==args.territory]
        print(json.dumps({"summary":payload["summary"],"oceans":rows},ensure_ascii=False,indent=2))
    else:
        print(json.dumps(payload,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
