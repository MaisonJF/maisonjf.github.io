#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping, Sequence

from commercial_assets import CommercialAssetContext


ROOT=Path(__file__).resolve().parent
REPO_ROOT=ROOT.parents[2]
REGISTRY=ROOT/"commercial-assets.generated.json"
TEMPLATE_SCHEMAS={
    "commercial_stocktake_template_v1",
    "commercial_service_capacity_template_v1",
    "commercial_digital_economics_template_v1",
}


def build_overlay(
    *,
    templates: Sequence[Mapping[str,Any]],
    observed_at: str,
    evidence_refs: Sequence[str]=(),
) -> dict[str,Any]:
    observed_at=observed_at.strip()
    if not observed_at:
        raise ValueError("observed_at_required")

    global_refs=tuple(sorted(set(str(x).strip() for x in evidence_refs if str(x).strip())))
    rows=[]
    seen=set()
    for template in templates:
        if template.get("schema_version") not in TEMPLATE_SCHEMAS:
            raise ValueError("unsupported_commercial_template_schema")
        for raw in template.get("assets",[]):
            if not isinstance(raw,Mapping):
                raise ValueError("template_asset_must_be_object")
            ref=str(raw.get("asset_ref") or "").strip()
            if not ref:
                raise ValueError("template_asset_ref_required")
            operational=raw.get("operational",{})
            if not isinstance(operational,Mapping):
                raise ValueError("template_operational_must_be_object")
            known={str(k):v for k,v in operational.items() if v is not None}
            if not known:
                continue
            if ref in seen:
                raise ValueError(f"duplicate_filled_asset:{ref}")
            seen.add(ref)
            row_refs=raw.get("evidence_refs",[])
            if not isinstance(row_refs,list):
                raise ValueError("template_evidence_refs_must_be_array")
            refs=tuple(sorted(set(
                [str(x).strip() for x in row_refs if str(x).strip()]
                + list(global_refs)
            )))
            if not refs:
                raise ValueError(f"evidence_ref_required_for_filled_asset:{ref}")
            rows.append({
                "asset_ref":ref,
                "source":str(raw.get("source") or "manual_operator_review"),
                "operational":known,
                "evidence_refs":list(refs),
            })

    if not rows:
        raise ValueError("no_filled_operational_values")

    payload={
        "schema_version":"commercial_asset_overlay_v1",
        "observed_at":observed_at,
        "assets":rows,
    }
    registry=json.loads(REGISTRY.read_text(encoding="utf-8"))
    CommercialAssetContext(registry,overlay=payload)
    return payload


def _outside_repo(path: Path) -> bool:
    resolved=path.expanduser().resolve()
    return not resolved.is_relative_to(REPO_ROOT.resolve())


def main() -> None:
    parser=argparse.ArgumentParser(
        description="Build a validated private commercial overlay from filled operator templates."
    )
    parser.add_argument("--stocktake",type=Path)
    parser.add_argument("--services",type=Path)
    parser.add_argument("--digital",type=Path)
    parser.add_argument("--observed-at",required=True)
    parser.add_argument("--evidence-ref",action="append",default=[])
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()

    inputs=[x for x in (args.stocktake,args.services,args.digital) if x is not None]
    if not inputs:
        raise SystemExit("at least one of --stocktake, --services or --digital is required")
    if not _outside_repo(args.output):
        raise SystemExit("refusing to write a private commercial overlay inside the repository")

    templates=[json.loads(path.read_text(encoding="utf-8")) for path in inputs]
    payload=build_overlay(
        templates=templates,
        observed_at=args.observed_at,
        evidence_refs=args.evidence_ref,
    )
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "kind":"maison_private_commercial_overlay_prepared",
        "output":str(args.output),
        "asset_count":len(payload["assets"]),
        "values_printed":False,
        "validated_against_catalogue":True,
        "stored_in_repository":False,
    },ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
