#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Mapping


ROOT=Path(__file__).resolve().parent
POLICY=ROOT/"commercial-attention-policy.json"
ASSETS=ROOT/"commercial-assets.generated.json"
EDITORIAL=ROOT/"editorial-queue.json"
OUTPUT=ROOT/"commercial-attention.generated.json"


def _norm(value: object) -> str:
    text=unicodedata.normalize("NFD",str(value or ""))
    text="".join(ch for ch in text if unicodedata.category(ch)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",text.lower()).strip()


def _tokens(value: object) -> frozenset[str]:
    out=[]
    for token in _norm(value).split():
        if len(token)<=2:
            continue
        if len(token)>4 and token.endswith("s"):
            token=token[:-1]
        out.append(token)
    return frozenset(out)


def _overlap(left: object,right: object) -> float:
    a,b=_tokens(left),_tokens(right)
    if not a or not b:
        return 0.0
    return len(a & b)/len(a | b)


def _territories(editorial: Mapping[str,Any]) -> dict[str,dict[str,Any]]:
    best={}
    for raw in editorial.get("items",[]):
        if not isinstance(raw,Mapping):
            continue
        territory=str(raw.get("territory") or raw.get("sourceOceanId") or "").strip()
        if not territory:
            continue
        row={
            "territory":territory,
            "pain_language":str(raw.get("painLanguage") or ""),
            "intent":str(raw.get("intent") or ""),
            "commercial_adjacency":str(raw.get("commercialAdjacency") or ""),
            "question_themes":[str(x) for x in raw.get("questionThemeCandidates",[]) if str(x).strip()]
                if isinstance(raw.get("questionThemeCandidates"),list) else [],
        }
        previous=best.get(territory)
        if previous is None or len(row["question_themes"])>len(previous["question_themes"]):
            best[territory]=row
    return best


def _operational_blockers(asset: Mapping[str,Any]) -> list[str]:
    operational=asset.get("operational",{})
    if not isinstance(operational,Mapping):
        operational={}
    if asset.get("asset_type")=="physical_product":
        blockers=[]
        if operational.get("inventory_quantity") is None:
            blockers.append("inventory_unknown")
        if operational.get("unit_material_cost_minor") is None:
            blockers.append("unit_material_cost_unknown")
        if operational.get("packaging_cost_minor") is None:
            blockers.append("packaging_cost_unknown")
        return blockers
    blockers=[]
    if operational.get("capacity_units_per_period") is None:
        blockers.append("capacity_unknown")
    if operational.get("variable_cost_minor") is None:
        blockers.append("variable_cost_unknown")
    if operational.get("human_effort_minutes") is None:
        blockers.append("human_effort_unknown")
    return blockers


def build_attention(
    *,
    policy: Mapping[str,Any],
    registry: Mapping[str,Any],
    editorial: Mapping[str,Any],
) -> dict[str,Any]:
    if policy.get("schema_version")!="commercial_attention_policy_v1":
        raise ValueError("unsupported_commercial_attention_policy")

    threshold=float(policy["contextual_match_min"])
    weights=policy["weights"]
    barriers=policy["price_barriers_minor"]
    aliases=policy.get("direct_aliases",{})
    territories=_territories(editorial)

    rows=[]
    for asset in registry.get("assets",[]):
        if not isinstance(asset,Mapping):
            continue
        if asset.get("public") is not True or asset.get("lifecycle_status")!="active":
            continue

        ref=str(asset.get("asset_ref") or "")
        alias_values=aliases.get(ref,[])
        normalized_aliases=[_norm(x) for x in alias_values if _norm(x)]
        direct=[]
        contextual=[]

        haystack=" ".join(str(x) for x in (
            asset.get("name",""),
            asset.get("category",""),
            asset.get("description",""),
            *(asset.get("search_context",[]) if isinstance(asset.get("search_context"),list) else []),
        ))

        for territory,row in territories.items():
            adjacency=_norm(row["commercial_adjacency"])
            if any(alias in adjacency for alias in normalized_aliases):
                direct.append(territory)

            query=" ".join((
                row["pain_language"],
                row["intent"],
                row["commercial_adjacency"],
                *row["question_themes"],
            ))
            score=_overlap(query,haystack)
            if score>=threshold:
                contextual.append({
                    "territory":territory,
                    "score":round(score,4),
                })

        price=asset.get("price_minor")
        price_points=0
        price_reason=None
        if isinstance(price,int):
            if price<=int(barriers["low_max"]):
                price_points=int(weights["low_price_barrier"])
                price_reason="low_price_barrier"
            elif price<=int(barriers["medium_max"]):
                price_points=int(weights["medium_price_barrier"])
                price_reason="medium_price_barrier"

        attention_score=(
            len(direct)*int(weights["direct_ocean_adjacency"])
            + len(contextual)*int(weights["contextual_ocean_match"])
            + price_points
            + int(weights["public_active_asset"])
        )
        blockers=_operational_blockers(asset)

        rows.append({
            "asset_ref":ref,
            "name":str(asset.get("name") or ref),
            "asset_type":str(asset.get("asset_type") or "unknown"),
            "slug":asset.get("slug"),
            "price_minor":price,
            "price_label":asset.get("price_label"),
            "currency":asset.get("currency"),
            "attention_score":attention_score,
            "direct_ocean_mentions":len(direct),
            "direct_ocean_territories":sorted(direct),
            "contextual_ocean_matches":sorted(
                contextual,
                key=lambda x:(-x["score"],x["territory"]),
            ),
            "operational_blockers":blockers,
            "profitability_known":False,
            "ready_for_automatic_sale":False,
            "reason_codes":[
                *(["direct_ocean_adjacency"] if direct else []),
                *(["contextual_ocean_match"] if contextual else []),
                *([price_reason] if price_reason else []),
                "public_active_asset",
                *blockers,
            ],
            "authority":{
                "public_write_authorized":False,
                "discount_authorized":False,
                "stock_promise_authorized":False,
                "automatic_checkout_authorized":False,
            },
        })

    rows.sort(key=lambda x:(-x["attention_score"],x["price_minor"] if isinstance(x["price_minor"],int) else 10**12,x["asset_ref"]))
    for index,row in enumerate(rows,1):
        row["attention_rank"]=index

    return {
        "schema_version":"commercial_attention_v1",
        "source_assets":"commercial-assets.generated.json",
        "source_oceans":"editorial-queue.json",
        "policy":"commercial-attention-policy.json",
        "contract":{
            "internal_only":True,
            "attention_score_is_not_profit_score":True,
            "operational_unknowns_block_execution":True,
            "ocean_metadata_is_context_not_external_evidence":True,
            "automatic_publication":False,
            "automatic_discount":False,
            "automatic_checkout":False,
        },
        "summary":{
            "ranked_assets":len(rows),
            "physical_products":sum(x["asset_type"]=="physical_product" for x in rows),
            "services":sum(x["asset_type"]=="service" for x in rows),
            "b2b_services":sum(x["asset_type"]=="b2b_service" for x in rows),
            "execution_ready":sum(not x["operational_blockers"] for x in rows),
        },
        "assets":rows,
    }


def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()

    payload=build_attention(
        policy=json.loads(POLICY.read_text(encoding="utf-8")),
        registry=json.loads(ASSETS.read_text(encoding="utf-8")),
        editorial=json.loads(EDITORIAL.read_text(encoding="utf-8")),
    )
    rendered=json.dumps(payload,ensure_ascii=False,indent=2)+"\n"
    if args.check:
        if OUTPUT.read_text(encoding="utf-8")!=rendered:
            raise SystemExit("commercial-attention.generated.json is stale; run build_commercial_attention.py")
        print(f"Commercial attention projection: OK · {payload['summary']['ranked_assets']} assets")
        return
    OUTPUT.write_text(rendered,encoding="utf-8")
    print(f"Wrote {payload['summary']['ranked_assets']} ranked assets")


if __name__=="__main__":
    main()
