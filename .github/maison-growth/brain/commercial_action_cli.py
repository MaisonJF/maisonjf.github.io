#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from typing import Any, Mapping

from brain_control_client import BrainControlClient


def client() -> BrainControlClient:
    return BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )


def _rows(payload: Mapping[str, Any], key: str) -> list[dict[str, Any]]:
    value = payload.get(key, [])
    return [dict(x) for x in value if isinstance(x, Mapping)] if isinstance(value, list) else []


def summarize(payload: Mapping[str, Any]) -> dict[str, Any]:
    decide = _rows(payload, "decide")
    pilots = _rows(payload, "manual_pilots")
    drafts = _rows(payload, "a8_drafts")
    return {
        "kind": "commercial_action_inbox_summary",
        "counts": {
            "decide": len(decide),
            "manual_pilots": len(pilots),
            "a8_drafts": len(drafts),
            "total": len(decide) + len(pilots) + len(drafts),
        },
        "decide": [
            {
                "queue_id": row.get("queue_id"),
                "priority": row.get("priority"),
                "territory_code": row.get("territory_code"),
                "offer_type": row.get("offer_type"),
                "existing_solution_id": row.get("existing_solution_id"),
                "opportunity_score": row.get("opportunity_score"),
                "opportunity_confidence": row.get("opportunity_confidence"),
                "validation_mode": row.get("validation_mode"),
            }
            for row in decide
        ],
        "manual_pilots": [
            {
                "validation_plan_id": row.get("validation_plan_id"),
                "opportunity_id": row.get("opportunity_id"),
                "offer_hypothesis_id": row.get("offer_hypothesis_id"),
                "plan_kind": row.get("plan_kind"),
                "validation_mode": row.get("validation_mode"),
                "primary_metric_key": row.get("primary_metric_key"),
            }
            for row in pilots
        ],
        "a8_drafts": [
            {
                "validation_plan_id": row.get("validation_plan_id"),
                "experiment_id": row.get("experiment_id"),
                "experiment_version_id": row.get("experiment_version_id"),
                "experiment_state": row.get("experiment_state"),
                "primary_metric_key": row.get("primary_metric_key"),
            }
            for row in drafts
        ],
        "authority": dict(payload.get("authority", {})) if isinstance(payload.get("authority"), Mapping) else {},
        "writes_performed": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Read the Maison Commercial Action Inbox.")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--raw", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.limit <= 100:
        raise SystemExit("--limit must be between 1 and 100")

    result = client().action_inbox(limit=args.limit)
    output = dict(result) if args.raw else summarize(result)
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
