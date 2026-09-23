#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def main() -> None:
    parser=argparse.ArgumentParser(description="Render an activation plan only; never deploys or changes remote config.")
    parser.add_argument("stage",choices=("infra_only","keyless_observe_candidate","memory_mirror_candidate"))
    args=parser.parse_args()

    policy=json.loads((ROOT/"observe-only-policy.json").read_text(encoding="utf-8"))
    stage=policy["stages"][args.stage]
    plan={
        "stage":args.stage,
        "changes_only_not_applied":True,
        "WORKER_ENABLED":str(stage["worker_enabled"]).lower(),
        "KILL_SWITCH":str(stage["kill_switch"]).lower(),
        "OSIRIS_ENABLED":str(stage["osiris_osint_enabled"]).lower(),
        "OSIRIS_MEMORY_ENABLED":str(stage["osiris_memory_enabled"]).lower(),
        "OPENROUTER_ENABLED":"false",
        "OSIRIS_GATEWAY_ENABLED":"false",
        "outbound_authorized":False,
        "spend_authorized":False,
        "public_write_authorized":False,
        "requires_explicit_activation":stage.get("requires_explicit_activation",False),
        "requires_https_bridge_smoke_test":stage.get("requires_https_bridge_smoke_test",False),
    }
    print(json.dumps(plan,indent=2,sort_keys=True))


if __name__=="__main__":
    main()
