#!/usr/bin/env python3
from __future__ import annotations

import json
from typing import Any, Mapping

from brain_observe_cycle import build_observe_output
from commercial_cycle import _allowed_states, control_client, run_commercial_cycle


def safe_summary(report: Mapping[str,Any]) -> dict[str,Any]:
    before=report.get("inbox_before",{})
    after=report.get("inbox_after",{})
    return {
        "kind":"maison_private_commercial_preview_summary",
        "mode":report.get("mode"),
        "observe":dict(report.get("observe",{})) if isinstance(report.get("observe"),Mapping) else {},
        "selected_previews":report.get("selected_previews",0),
        "selected_for_human_review":report.get("selected_for_human_review",0),
        "selected_analysis_only":report.get("selected_analysis_only",0),
        "inbox_before_counts":dict(before.get("counts",{})) if isinstance(before,Mapping) and isinstance(before.get("counts"),Mapping) else {},
        "inbox_after_counts":dict(after.get("counts",{})) if isinstance(after,Mapping) and isinstance(after.get("counts"),Mapping) else {},
        "writes_performed":False,
        "authority":{
            "public_write_authorized":False,
            "outbound_authorized":False,
            "spend_authorized":False,
            "experiment_execution_authorized":False,
            "human_decision_automated":False,
        },
        "identifiers_printed":False,
    }


def main() -> None:
    control=control_client()
    observe_output=build_observe_output()
    report=run_commercial_cycle(
        control=control,
        observe_output=observe_output,
        enabled=False,
        allowed_states=_allowed_states(),
        proposal=None,
    )
    print(json.dumps(safe_summary(report),ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
