#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping


ROOT=Path(__file__).resolve().parent
QUEUE=ROOT/"editorial-queue.json"
ASSETS=ROOT/"commercial-assets.generated.json"
OCEANS=ROOT.parent/"oceans"/"candidates.json"


def build_coverage(
    *,
    queue: Mapping[str,Any],
    registry: Mapping[str,Any],
    canonical_oceans: Mapping[str,Any] | None = None,
) -> dict[str,Any]:
    assets={
        str(row.get("asset_ref")):dict(row)
        for row in registry.get("assets",[])
        if isinstance(row,Mapping) and row.get("asset_ref")
    }
    oracle_asset=assets.get("catalog:digital:oracle")
    pdi_asset=assets.get("catalog:digital:pdi")
    if oracle_asset is None or pdi_asset is None:
        raise ValueError("digital_product_assets_missing")

    question_items={}
    oracle_items={}
    for raw in queue.get("items",[]):
        if not isinstance(raw,Mapping):
            continue
        territory=str(raw.get("sourceOceanId") or raw.get("territory") or "").strip()
        if not territory:
            continue
        if raw.get("type")=="question_candidate":
            question_items[territory]=dict(raw)
        if raw.get("type")=="oracle_candidate":
            oracle_items[territory]=dict(raw)

    canonical_rows={}
    if canonical_oceans is not None:
        source_rows=canonical_oceans.get("candidates",[]) if isinstance(canonical_oceans,Mapping) else []
        for raw in source_rows:
            if not isinstance(raw,Mapping):
                continue
            territory=str(raw.get("territory") or raw.get("id") or raw.get("slug") or "").strip()
            if territory:
                canonical_rows[territory]=dict(raw)

    territories=sorted(set(canonical_rows)|set(question_items)|set(oracle_items))
    rows=[]
    for territory in territories:
        q=question_items.get(territory)
        o=oracle_items.get(territory)
        canonical=canonical_rows.get(territory)
        expected_pdi=bool(canonical.get("questionPotential") is True) if canonical is not None else q is not None
        expected_oracle=bool(canonical.get("oraclePotential") is True) if canonical is not None else o is not None
        themes=list(q.get("questionThemeCandidates",[])) if q else []
        stages=list(q.get("stageCandidates",[])) if q else []
        question_slots=list(q.get("questionDesignSlots",[])) if q else []
        roles=list(o.get("roleCandidates",[])) if o else []
        gaps=[]
        if expected_pdi and q is None:
            gaps.append("pdi_feed_missing")
        if not expected_pdi and q is not None:
            gaps.append("pdi_feed_unexpected")
        if expected_oracle and o is None:
            gaps.append("oracle_feed_missing")
        if not expected_oracle and o is not None:
            gaps.append("oracle_feed_unexpected")
        if q is not None and len(question_slots)!=len(themes)*len(stages):
            gaps.append("pdi_slot_contract_mismatch")
        if o is not None and len(roles)!=7:
            gaps.append("oracle_role_contract_mismatch")
        row={
            "territory":territory,
            "expected":{
                "pdi":expected_pdi,
                "oracle":expected_oracle,
            },
            "pdi":{
                "asset_ref":pdi_asset["asset_ref"],
                "eligible":q is not None,
                "theme_hypotheses":len(themes),
                "stage_slots":len(question_slots),
                "stages":stages,
                "approval_required":bool(q and q.get("approvalRequired") is True),
                "automatic_activation":bool(q and q.get("automaticActivation") is True),
                "paid_body_stored":bool(q and q.get("bodyStored") is True),
            },
            "oracle":{
                "asset_ref":oracle_asset["asset_ref"],
                "eligible":o is not None,
                "role_slots":len(roles),
                "roles":roles,
                "approval_required":bool(o and o.get("approvalRequired") is True),
                "automatic_activation":bool(o and o.get("automaticActivation") is True),
                "paid_body_stored":bool(o and o.get("bodyStored") is True),
            },
            "gaps":gaps,
        }
        if row["pdi"]["paid_body_stored"] or row["oracle"]["paid_body_stored"]:
            raise ValueError("paid_body_contract_violation:"+territory)
        if row["pdi"]["automatic_activation"] or row["oracle"]["automatic_activation"]:
            raise ValueError("automatic_activation_contract_violation:"+territory)
        rows.append(row)

    oracle_system=oracle_asset.get("content_system",{})
    pdi_system=pdi_asset.get("content_system",{})
    return {
        "schema_version":"digital_experience_coverage_v1",
        "visibility":"internal_brain",
        "sources":["../oceans/candidates.json","editorial-queue.json","commercial-assets.generated.json"],
        "contract":{
            "paid_bodies_stored":False,
            "automatic_publication":False,
            "automatic_activation":False,
            "human_editorial_approval_required":True,
            "ocean_metadata_is_not_external_evidence":True,
            "product_availability_does_not_bypass_checkout_or_editorial_gates":True,
            "derived_at_read_time":True,
        },
        "products":{
            "oracle":{
                "asset_ref":oracle_asset["asset_ref"],
                "price_minor":oracle_asset.get("price_minor"),
                "currency":oracle_asset.get("currency"),
                "territory_source_count":oracle_system.get("territory_count"),
                "feed":"oracle_candidate",
                "roles":list(oracle_system.get("roles",[])),
            },
            "pdi":{
                "asset_ref":pdi_asset["asset_ref"],
                "price_minor":pdi_asset.get("price_minor"),
                "currency":pdi_asset.get("currency"),
                "source_theme_count":pdi_system.get("source_theme_count"),
                "feed":"question_candidate",
                "stages":list(pdi_system.get("stages",[])),
            },
        },
        "summary":{
            "oceans":len(territories),
            "expected_pdi_oceans":sum(row["expected"]["pdi"] for row in rows),
            "expected_oracle_oceans":sum(row["expected"]["oracle"] for row in rows),
            "pdi_oceans":sum(row["pdi"]["eligible"] for row in rows),
            "oracle_oceans":sum(row["oracle"]["eligible"] for row in rows),
            "pdi_theme_hypotheses":sum(row["pdi"]["theme_hypotheses"] for row in rows),
            "pdi_stage_slots":sum(row["pdi"]["stage_slots"] for row in rows),
            "oracle_role_slots":sum(row["oracle"]["role_slots"] for row in rows),
            "oceans_with_feed_gaps":sum(bool(row["gaps"]) for row in rows),
        },
        "oceans":rows,
    }


def load_coverage() -> dict[str,Any]:
    return build_coverage(
        queue=json.loads(QUEUE.read_text(encoding="utf-8")),
        registry=json.loads(ASSETS.read_text(encoding="utf-8")),
        canonical_oceans=json.loads(OCEANS.read_text(encoding="utf-8")),
    )


def main() -> None:
    parser=argparse.ArgumentParser(description="Validate/read live-derived Ocean → Oráculo/PDI coverage.")
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    payload=load_coverage()
    if args.check and payload["summary"]["oceans_with_feed_gaps"]:
        print("digital_experience_growth_pending:"+str(payload["summary"]["oceans_with_feed_gaps"]))
    print(json.dumps(payload["summary"],ensure_ascii=False))


if __name__=="__main__":
    main()
