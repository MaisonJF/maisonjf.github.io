#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os

from brain_control_client import BrainControlClient
from brain_review_decision_client import BrainReviewDecisionClient


def _true(value: object) -> bool:
    return str(value or "").strip().lower()=="true"


def control_client() -> BrainControlClient:
    return BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )


def main() -> None:
    parser=argparse.ArgumentParser(description="Maison commercial human review CLI")
    sub=parser.add_subparsers(dest="command",required=True)

    listing=sub.add_parser("list")
    listing.add_argument("--status",choices=("pending","approved","rejected","expired"),default="pending")
    listing.add_argument("--limit",type=int,default=20)

    decide=sub.add_parser("decide")
    decide.add_argument("queue_id")
    decide.add_argument("decision",choices=("approved","rejected"))
    decide.add_argument("--reason",required=True)
    decide.add_argument("--evidence-ref",action="append",default=[])

    args=parser.parse_args()

    if args.command=="list":
        result=control_client().review_queue(status=args.status,limit=args.limit)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return

    if not _true(os.environ.get("MAISON_REVIEW_DECISION_ENABLED")):
        raise SystemExit("MAISON_REVIEW_DECISION_ENABLED is false; refusing to record a decision.")

    client=BrainReviewDecisionClient(
        base_url=os.environ["BRAIN_REVIEW_DECISION_API_URL"],
        token=os.environ["BRAIN_REVIEW_DECISION_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    result=client.decide(
        queue_id=args.queue_id,
        decision=args.decision,
        decision_reason=args.reason,
        evidence_refs=tuple(args.evidence_ref),
    )
    print(json.dumps(result,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
