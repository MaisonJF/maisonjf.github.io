#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, Mapping

HERE=Path(__file__).resolve().parent
BRAIN=HERE.parent/"brain"
sys.path.insert(0,str(HERE))
sys.path.insert(0,str(BRAIN))

from brain_control_client import BrainControlClient  # noqa: E402
from content_bridge import content_event_to_learning, content_learning_identity  # noqa: E402
from runtime_client import A11LearningClient  # noqa: E402

POLICY=json.loads((HERE/"learning-policy.json").read_text(encoding="utf-8"))


def canonical(value: Any) -> str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)


def canonical_rule_id() -> str:
    digest=hashlib.sha256(canonical(POLICY).encode("utf-8")).hexdigest()
    return "rul_"+digest[:36]


def _rows(payload: Mapping[str,Any]) -> list[Mapping[str,Any]]:
    rows=payload.get("rows",[])
    return [row for row in rows if isinstance(row,Mapping)] if isinstance(rows,list) else []


def build_append_payload(event: Mapping[str,Any],confidence_before: int) -> dict[str,Any]:
    identity=content_learning_identity(event)
    count=event.get("independent_snapshot_count",1)
    record=content_event_to_learning(
        event,
        confidence_before=confidence_before,
        rule_version_id=canonical_rule_id(),
        independent_snapshot_count=count,
    )
    return {
        "source_event_id":event["event_id"],
        "record":{
            "learning_record_id":record.learning_record_id,
            "source_id":identity["source_id"],
            "subject_id":identity["subject_id"],
            "signal_class":record.signal_class,
            "expected_json":record.expected_json,
            "observed_json":record.observed_json,
            "economic_value_minor":record.observed_json.get("economic_value_minor"),
            "confidence_before":record.confidence_before,
            "confidence_after":record.confidence_after,
            "confidence_delta":record.confidence_delta,
            "reason_codes":list(record.reason_codes),
            "evidence_refs":list(record.evidence_refs),
            "input_hash":record.input_hash,
        }
    }


def run_content_learning_cycle(
    control: BrainControlClient,
    writer: A11LearningClient,
    *,
    page_size: int=100,
    max_pages: int=20,
) -> dict[str,Any]:
    if page_size<1 or page_size>100 or max_pages<1:
        raise ValueError("invalid pagination")
    after=None
    after_id=None
    pages=0
    accepted=0
    duplicates=0
    seen=0
    last_cursor=None

    while pages<max_pages:
        page=control.content_performance(limit=page_size,after=after,after_id=after_id)
        rows=_rows(page)
        if not rows:
            break
        pages+=1
        for event in rows:
            seen+=1
            identity=content_learning_identity(event)
            history=_rows(control.learning_subject(subject_id=identity["subject_id"],limit=1))
            before=int(history[0]["confidence_after"]) if history else int(POLICY["initial_confidence"])
            result=writer.append_content_learning(build_append_payload(event,before))
            if result.get("duplicate"):
                duplicates+=1
            else:
                accepted+=1
        cursor=page.get("next_cursor")
        if not isinstance(cursor,Mapping):
            break
        after=cursor.get("after")
        after_id=cursor.get("after_id")
        last_cursor=dict(cursor)
        if not after or not after_id:
            break

    return {
        "mode":"append_only_internal",
        "policy_version":POLICY["policy_version"],
        "rule_version_id":canonical_rule_id(),
        "pages":pages,
        "events_seen":seen,
        "accepted":accepted,
        "duplicates":duplicates,
        "next_cursor":last_cursor,
        "public_side_effects":False,
        "causal_claims":False,
    }


def main() -> None:
    if os.getenv("MAISON_A11_LEARNING_ENABLED","false").lower()!="true":
        print(json.dumps({"status":"disabled","reason":"MAISON_A11_LEARNING_ENABLED=false"}))
        return

    read_url=os.environ["BRAIN_CONTROL_API_URL"]
    read_token=os.environ["BRAIN_CONTROL_TOKEN"]
    write_url=os.getenv("A11_LEARNING_WRITE_API_URL",read_url)
    write_token=os.environ["A11_LEARNING_WRITE_TOKEN"]
    access_id=os.getenv("CF_ACCESS_CLIENT_ID") or None
    access_secret=os.getenv("CF_ACCESS_CLIENT_SECRET") or None

    control=BrainControlClient(
        read_url,read_token,
        access_client_id=access_id,
        access_client_secret=access_secret,
    )
    writer=A11LearningClient(
        write_url,write_token,
        access_client_id=access_id,
        access_client_secret=access_secret,
    )
    page_size=int(os.getenv("MAISON_A11_LEARNING_PAGE_SIZE","100"))
    max_pages=int(os.getenv("MAISON_A11_LEARNING_MAX_PAGES","20"))
    print(json.dumps(
        run_content_learning_cycle(control,writer,page_size=page_size,max_pages=max_pages),
        ensure_ascii=False,
        sort_keys=True,
    ))


if __name__=="__main__":
    main()
