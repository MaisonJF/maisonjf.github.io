#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any, Mapping

from brain_control_client import BrainControlClient
from commercial_assets import CommercialAssetContext
from manual_pilot_context import load_manual_pilot_context
from manual_pilot_dossier import build_pilot_dossier, dossier_to_dict


ROOT=Path(__file__).resolve().parent
REGISTRY=ROOT/"commercial-assets.generated.json"


def _client() -> BrainControlClient:
    return BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )


def build_operator_output(
    rows: list[Mapping[str,Any]],
    *,
    assets: CommercialAssetContext,
    full: bool,
    validation_plan_id: str | None=None,
    pilot_contexts: Mapping[str,Mapping[str,Any]] | None=None,
) -> dict[str,Any]:
    selected=[
        row for row in rows
        if validation_plan_id is None or str(row.get("validation_plan_id"))==validation_plan_id
    ]
    contexts=pilot_contexts or {}
    dossiers=[
        build_pilot_dossier(
            row,
            assets=assets,
            pilot_context=contexts.get(str(row.get("validation_plan_id") or "")),
        )
        for row in selected
    ]

    if full:
        return {
            "kind":"maison_manual_pilot_dossiers",
            "mode":"operator_full",
            "writes_performed":False,
            "execution_authority":False,
            "dossiers":[dossier_to_dict(x) for x in dossiers],
        }

    required=Counter(
        item
        for dossier in dossiers
        for item in dossier.required_inputs
    )
    by_kind=Counter(dossier.plan_kind for dossier in dossiers)
    by_state=Counter(dossier.ready_state for dossier in dossiers)
    return {
        "kind":"maison_manual_pilot_dossier_summary",
        "mode":"summary_only",
        "writes_performed":False,
        "execution_authority":False,
        "identifiers_printed":False,
        "counts":{
            "total":len(dossiers),
            "by_plan_kind":dict(sorted(by_kind.items())),
            "by_ready_state":dict(sorted(by_state.items())),
        },
        "most_common_required_inputs":[
            {"input":name,"count":count}
            for name,count in sorted(required.items(),key=lambda x:(-x[1],x[0]))[:20]
        ],
    }


def main() -> None:
    parser=argparse.ArgumentParser(
        description="Build read-only manual-pilot dossiers from the private Brain validation-plan surface."
    )
    parser.add_argument("--limit",type=int,default=50)
    parser.add_argument("--validation-plan-id")
    parser.add_argument("--overlay",type=Path)
    parser.add_argument(
        "--pilot-context",
        type=Path,
        help="Private evidence-backed manual-pilot context file. Values are never printed by summary mode.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Print full operator dossiers including internal identifiers. Prefer local/private terminals.",
    )
    args=parser.parse_args()

    if not 1 <= args.limit <= 100:
        raise SystemExit("--limit must be between 1 and 100")

    overlay_path=args.overlay
    if overlay_path is None:
        raw=os.environ.get("MAISON_COMMERCIAL_ASSET_OVERLAY_PATH","").strip()
        overlay_path=Path(raw) if raw else None

    assets=CommercialAssetContext.from_files(
        REGISTRY,
        overlay_path=overlay_path,
    )

    pilot_context_path=args.pilot_context
    if pilot_context_path is None:
        raw=os.environ.get("MAISON_MANUAL_PILOT_CONTEXT_PATH","").strip()
        pilot_context_path=Path(raw) if raw else None
    pilot_contexts=(
        load_manual_pilot_context(pilot_context_path)
        if pilot_context_path is not None
        else {}
    )

    payload=_client().validation_plans(
        state="manual_pilot_required",
        limit=args.limit,
    )
    rows=payload.get("rows",[])
    if not isinstance(rows,list):
        raise SystemExit("invalid validation plan payload")

    output=build_operator_output(
        [dict(x) for x in rows if isinstance(x,Mapping)],
        assets=assets,
        full=args.full,
        validation_plan_id=args.validation_plan_id,
        pilot_contexts=pilot_contexts,
    )
    print(json.dumps(output,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
