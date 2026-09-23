#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from typing import Any, Mapping

from brain_observe_cycle import build_observe_output
from brain_proposal_client import BrainProposalClient


def _true(value: object) -> bool:
    return str(value or "").strip().lower()=="true"


def _states() -> set[str]:
    raw=os.environ.get(
        "MAISON_A14_MATERIALIZE_STATES",
        "enrichment_required,human_review_preview",
    )
    return {x.strip() for x in raw.split(",") if x.strip()}


def build_materialization_payload(preview: Mapping[str,Any]) -> dict[str,Any]:
    state=str(preview.get("state") or "")
    opportunity=preview.get("opportunity")
    offers=preview.get("offer_hypotheses",[])
    matches=preview.get("distribution_matches",[])
    reviews=preview.get("a12_review_payloads",[])

    if not isinstance(opportunity,Mapping):
        raise ValueError("preview_opportunity_required")
    if not isinstance(offers,list) or not offers:
        raise ValueError("preview_offers_required")
    if not isinstance(matches,list):
        raise ValueError("preview_distribution_matches_must_be_array")
    if not isinstance(reviews,list):
        raise ValueError("preview_a12_reviews_must_be_array")

    queue_for_human=state=="human_review_preview"
    return {
        "schema":"maison.a14-materialize.v1",
        "queue_for_human":queue_for_human,
        "opportunity":dict(opportunity),
        "offer_hypotheses":[dict(x) for x in offers],
        "distribution_matches":[dict(x) for x in matches],
        "a12_review_payloads":[dict(x) for x in reviews] if queue_for_human else [],
    }


def main() -> None:
    output=build_observe_output()
    selected=[]
    allowed=_states()
    for preview in output.get("a14_previews",[]):
        if not isinstance(preview,Mapping):
            continue
        if preview.get("state") not in allowed:
            continue
        if preview.get("opportunity") is None or not preview.get("offer_hypotheses"):
            continue
        selected.append(build_materialization_payload(preview))

    enabled=_true(os.environ.get("MAISON_A14_MATERIALIZE_ENABLED"))
    summary={
        "enabled":enabled,
        "selected_previews":len(selected),
        "human_review_previews":sum(1 for x in selected if x["queue_for_human"]),
        "analysis_only_previews":sum(1 for x in selected if not x["queue_for_human"]),
        "writes_performed":False,
        "responses":[],
    }

    if not enabled:
        print(json.dumps(summary,indent=2,ensure_ascii=False))
        return

    client=BrainProposalClient(
        base_url=os.environ["BRAIN_PROPOSAL_API_URL"],
        token=os.environ["BRAIN_PROPOSAL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    responses=[]
    for payload in selected:
        responses.append(dict(client.materialize(payload)))

    summary["writes_performed"]=bool(selected)
    summary["responses"]=responses
    print(json.dumps(summary,indent=2,ensure_ascii=False))


if __name__=="__main__":
    main()
