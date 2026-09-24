#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Mapping


def build_checklist(report: Mapping[str,Any]) -> dict[str,Any]:
    attention=report.get("attention",[])
    bundles=report.get("bundles",[])
    blocker_counts=Counter()
    asset_rows=[]
    for row in attention if isinstance(attention,list) else []:
        blockers=[str(x) for x in row.get("blockers",[]) if x]
        blocker_counts.update(blockers)
        if blockers:
            asset_rows.append({
                "asset_ref":row.get("asset_ref"),
                "name":row.get("name"),
                "asset_type":row.get("asset_type"),
                "attention_rank":row.get("attention_rank"),
                "missing_facts":blockers,
            })

    bundle_rows=[]
    for row in bundles if isinstance(bundles,list) else []:
        blockers=[str(x) for x in row.get("blockers",[]) if x]
        blocker_counts.update(f"bundle:{x}" for x in blockers)
        if blockers:
            bundle_rows.append({
                "bundle_id":row.get("bundle_id"),
                "label":row.get("label"),
                "missing_facts":blockers,
            })

    asset_rows.sort(key=lambda x:(x.get("attention_rank") is None,x.get("attention_rank") or 999999))
    return {
        "kind":"maison_precloud_operator_checklist",
        "source_kind":report.get("kind"),
        "overlay_loaded":bool(report.get("overlay_loaded")),
        "summary":{
            "assets_with_missing_facts":len(asset_rows),
            "bundles_with_missing_facts":len(bundle_rows),
            "distinct_blockers":len(blocker_counts),
        },
        "most_common_blockers":[
            {"blocker":name,"occurrences":count}
            for name,count in blocker_counts.most_common()
        ],
        "assets_to_review":asset_rows,
        "bundles_to_review":bundle_rows,
        "authority":{
            "public_write_authorized":False,
            "discount_authorized":False,
            "stock_promise_authorized":False,
            "automatic_checkout_authorized":False,
            "experiment_execution_authorized":False,
        },
    }


def main() -> None:
    parser=argparse.ArgumentParser(
        description="Turn a commercial operator readiness report into a fact-collection checklist."
    )
    parser.add_argument("report",type=Path)
    args=parser.parse_args()
    report=json.loads(args.report.read_text(encoding="utf-8"))
    print(json.dumps(build_checklist(report),ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
