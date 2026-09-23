#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Mapping

from a8_draft_planner import A8DraftPlanningError, build_a8_draft
from brain_control_client import BrainControlClient
from brain_proposal_client import BrainProposalClient


class CtaContextError(ValueError):
    pass


def _true(value: object) -> bool:
    return str(value or "").strip().lower()=="true"


def load_cta_context(path: Path) -> dict[str,Mapping[str,Any]]:
    raw=json.loads(path.read_text(encoding="utf-8"))
    if raw.get("schema_version")!="cta_experiment_context_v1":
        raise CtaContextError("unsupported_cta_context_schema")
    if not isinstance(raw.get("observed_at"),str) or not raw["observed_at"].strip():
        raise CtaContextError("cta_context_observed_at_required")
    rows=raw.get("contexts")
    if not isinstance(rows,list):
        raise CtaContextError("cta_contexts_must_be_array")

    allowed={
        "validation_plan_id","source_asset_id","cta_slot_key","control_solution_id",
        "treatment_solution_id","a7_decision_id","max_exposures","territory_key","evidence_refs",
    }
    out={}
    for row in rows:
        if not isinstance(row,Mapping):
            raise CtaContextError("cta_context_row_must_be_object")
        extra=set(row)-allowed
        if extra:
            raise CtaContextError("cta_context_unknown_fields:"+",".join(sorted(extra)))
        plan_id=str(row.get("validation_plan_id") or "")
        if not plan_id.startswith("vpl_") or len(plan_id)!=40:
            raise CtaContextError("invalid_cta_context_validation_plan_id")
        if plan_id in out:
            raise CtaContextError("duplicate_cta_context_validation_plan_id")
        refs=row.get("evidence_refs")
        if not isinstance(refs,list) or not refs or not all(isinstance(x,str) and x.strip() for x in refs):
            raise CtaContextError("cta_context_evidence_refs_required")
        out[plan_id]=dict(row)
    return out


def build_drafts(
    *,
    control: BrainControlClient,
    contexts: Mapping[str,Mapping[str,Any]],
    limit: int=50,
) -> tuple[list[dict[str,Any]],list[dict[str,Any]]]:
    payload=control.validation_plans(state="blocked_needs_a7_decision",limit=limit)
    rows=payload.get("rows",[])
    if not isinstance(rows,list):
        raise CtaContextError("validation_plan_rows_must_be_array")

    drafts=[]
    blocked=[]
    for row in rows:
        if not isinstance(row,Mapping):
            continue
        plan_id=str(row.get("validation_plan_id") or "")
        context=contexts.get(plan_id)
        if context is None:
            blocked.append({"validation_plan_id":plan_id,"reason":"private_cta_context_missing"})
            continue
        solution_id=str(row.get("existing_solution_id") or "")
        decisions_payload=control.a7_test_cta_decisions(solution_id=solution_id,limit=20)
        decisions=decisions_payload.get("rows",[])
        if not isinstance(decisions,list):
            blocked.append({"validation_plan_id":plan_id,"reason":"a7_decision_rows_invalid"})
            continue
        try:
            drafts.append(build_a8_draft(row,a7_decisions=decisions,cta_context=context))
        except A8DraftPlanningError as exc:
            blocked.append({"validation_plan_id":plan_id,"reason":str(exc)})
    return drafts,blocked


def main() -> None:
    raw_path=os.environ.get("MAISON_CTA_CONTEXT_PATH","").strip()
    if not raw_path:
        raise SystemExit("MAISON_CTA_CONTEXT_PATH is required; no CTA context will be invented.")
    contexts=load_cta_context(Path(raw_path))

    control=BrainControlClient(
        base_url=os.environ["BRAIN_CONTROL_API_URL"],
        token=os.environ["BRAIN_CONTROL_TOKEN"],
        access_client_id=os.environ.get("CF_ACCESS_CLIENT_ID"),
        access_client_secret=os.environ.get("CF_ACCESS_CLIENT_SECRET"),
    )
    drafts,blocked=build_drafts(
        control=control,
        contexts=contexts,
        limit=int(os.environ.get("MAISON_A8_DRAFT_LIMIT","50")),
    )
    enabled=_true(os.environ.get("MAISON_A8_DRAFT_MATERIALIZE_ENABLED"))
    summary={
        "enabled":enabled,
        "drafts_built":len(drafts),
        "blocked":blocked,
        "writes_performed":False,
        "responses":[],
        "preview":drafts,
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
    responses=[dict(proposal.persist_a8_draft(draft)) for draft in drafts]
    summary["writes_performed"]=bool(drafts)
    summary["responses"]=responses
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__=="__main__":
    main()
