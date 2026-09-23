#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from brain_control_client import BrainControlClient
from brain_proposal_client import BrainProposalClient

ROOT=Path(__file__).resolve().parent
A14_DIR=ROOT.parent/"a14"
if str(A14_DIR) not in sys.path:
    sys.path.insert(0,str(A14_DIR))

from validation_planner import build_validation_plan  # noqa:E402


def _true(value: object) -> bool:
    return str(value or "").strip().lower()=="true"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")


def build_plan_payload(row: Mapping[str,Any]) -> dict[str,Any]:
    plan=build_validation_plan(row)
    plan["created_at"]=_now()
    return plan


def main() -> None:
    control=BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    rows=control.approved_validations(
        limit=int(os.environ.get("MAISON_VALIDATION_PLAN_LIMIT","50"))
    ).get("rows",[])
    if not isinstance(rows,list):
        raise SystemExit("approved validation response rows must be an array")

    plans=[build_plan_payload(row) for row in rows if isinstance(row,Mapping)]
    enabled=_true(os.environ.get("MAISON_VALIDATION_PLAN_MATERIALIZE_ENABLED"))
    summary={
        "enabled":enabled,
        "approved_rows":len(rows),
        "plans_built":len(plans),
        "manual_pilots":sum(1 for p in plans if p["state"]=="manual_pilot_required"),
        "a8_blocked_waiting_for_a7":sum(1 for p in plans if p["state"]=="blocked_needs_a7_decision"),
        "writes_performed":False,
        "responses":[],
        "preview":plans,
    }
    if not enabled:
        print(json.dumps(summary,ensure_ascii=False,indent=2))
        return

    proposal=BrainProposalClient(
        base_url=os.environ["BRAIN_PROPOSAL_API_URL"],
        token=os.environ["BRAIN_PROPOSAL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    responses=[dict(proposal.persist_validation_plan(plan)) for plan in plans]
    summary["writes_performed"]=bool(plans)
    summary["responses"]=responses
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
