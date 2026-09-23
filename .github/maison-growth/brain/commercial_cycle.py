#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from typing import Any, Mapping, Sequence

from brain_control_client import BrainControlClient
from brain_observe_cycle import build_observe_output
from brain_proposal_client import BrainProposalClient
from commercial_action_cli import summarize as summarize_inbox
from materialize_a14 import build_materialization_payload


def _true(value: object) -> bool:
    return str(value or "").strip().lower() == "true"


def _allowed_states() -> set[str]:
    raw = os.environ.get(
        "MAISON_A14_MATERIALIZE_STATES",
        "enrichment_required,human_review_preview",
    )
    return {x.strip() for x in raw.split(",") if x.strip()}


def select_payloads(
    observe_output: Mapping[str, Any],
    allowed_states: Sequence[str] | set[str],
) -> list[dict[str, Any]]:
    allowed = set(allowed_states)
    selected: list[dict[str, Any]] = []
    previews = observe_output.get("a14_previews", [])
    if not isinstance(previews, list):
        return selected
    for preview in previews:
        if not isinstance(preview, Mapping):
            continue
        if preview.get("state") not in allowed:
            continue
        if preview.get("opportunity") is None or not preview.get("offer_hypotheses"):
            continue
        selected.append(build_materialization_payload(preview))
    return selected


def control_client() -> BrainControlClient:
    return BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )


def proposal_client() -> BrainProposalClient:
    return BrainProposalClient(
        base_url=os.environ["BRAIN_PROPOSAL_API_URL"],
        token=os.environ["BRAIN_PROPOSAL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )


def main() -> None:
    control = control_client()
    inbox_before = summarize_inbox(control.action_inbox(limit=50))

    observe_output = build_observe_output()
    selected = select_payloads(observe_output, _allowed_states())
    enabled = _true(os.environ.get("MAISON_A14_MATERIALIZE_ENABLED"))

    responses: list[dict[str, Any]] = []
    if enabled and selected:
        proposals = proposal_client()
        for payload in selected:
            responses.append(dict(proposals.materialize(payload)))

    inbox_after = summarize_inbox(control.action_inbox(limit=50))
    report = {
        "kind": "maison_private_commercial_cycle",
        "mode": "materialize_to_human_inbox" if enabled else "preview_only",
        "observe": {
            "feed_rows": observe_output.get("feed_rows", 0),
            "packets": len(observe_output.get("packets", [])),
            "a14_previews": len(observe_output.get("a14_previews", [])),
        },
        "selected_previews": len(selected),
        "selected_for_human_review": sum(1 for x in selected if x.get("queue_for_human") is True),
        "selected_analysis_only": sum(1 for x in selected if x.get("queue_for_human") is False),
        "writes_performed": bool(enabled and selected),
        "write_scope": "a14_hypotheses_and_a12_queue_only" if enabled else "none",
        "proposal_responses": responses,
        "inbox_before": inbox_before,
        "inbox_after": inbox_after,
        "authority": {
            "public_write_authorized": False,
            "outbound_authorized": False,
            "spend_authorized": False,
            "experiment_execution_authorized": False,
            "human_decision_automated": False,
        },
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
