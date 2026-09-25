#!/usr/bin/env python3
from __future__ import annotations

import json
from typing import Any, Mapping

from engine import LearningError, LearningRecord, evaluate_content_performance

FORBIDDEN_ECONOMIC_METADATA = {
    "economic_value_minor",
    "expected_economic_value_minor",
    "observed_economic_value_minor",
    "revenue_minor",
    "margin_minor",
}

def _metadata(event: Mapping[str, Any]) -> dict[str, Any]:
    raw=event.get("metadata")
    if isinstance(raw,Mapping):
        return dict(raw)
    raw_json=event.get("metadata_json","{}")
    if not isinstance(raw_json,str):
        raise LearningError("invalid content event metadata")
    try:
        parsed=json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise LearningError("invalid content event metadata") from exc
    if not isinstance(parsed,dict):
        raise LearningError("invalid content event metadata")
    return parsed

def content_event_to_learning(
    event: Mapping[str, Any],
    *,
    confidence_before: int,
    rule_version_id: str,
    independent_snapshot_count: int = 1,
    a3_economics: Mapping[str, Any] | None = None,
) -> LearningRecord:
    """Map one canonical A1 content snapshot into governed A11 learning.

    Audience counts are not treated as independent observations. The caller may
    supply a deduplicated independent_snapshot_count only after comparing
    non-overlapping observations. Economic fields are accepted only through an
    explicit A3-owned mapping, never from content engagement metadata.
    """
    if event.get("source")!="maison-content-distribution":
        raise LearningError("unsupported content source")
    if event.get("event_type")!="content.performance_observed":
        raise LearningError("unsupported content event")
    if event.get("privacy_class")!="aggregated":
        raise LearningError("content feedback must be aggregated")
    if not isinstance(independent_snapshot_count,int) or isinstance(independent_snapshot_count,bool) or independent_snapshot_count<1:
        raise LearningError("invalid independent snapshot count")

    meta=_metadata(event)
    if FORBIDDEN_ECONOMIC_METADATA & set(meta):
        raise LearningError("content metadata cannot supply economics")
    content_id=str(meta.get("content_id") or "").strip()
    if not content_id:
        raise LearningError("content_id required")

    click_rate=meta.get("click_rate_bps")
    if click_rate is not None:
        if isinstance(click_rate,bool) or not isinstance(click_rate,int) or not 0<=click_rate<=10000:
            raise LearningError("invalid content click rate")

    economics=dict(a3_economics or {})
    if economics:
        if economics.get("source")!="A3":
            raise LearningError("content economics must come from A3")
        economic_count=economics.get("economic_observation_count",0)
        if isinstance(economic_count,bool) or not isinstance(economic_count,int) or economic_count<0:
            raise LearningError("invalid A3 economic observation count")
        expected=economics.get("expected_economic_value_minor")
        observed=economics.get("observed_economic_value_minor")
        for value in (expected,observed):
            if value is not None and (isinstance(value,bool) or not isinstance(value,int)):
                raise LearningError("invalid A3 economic value")
    else:
        economic_count=0
        expected=None
        observed=None

    event_id=str(event.get("event_id") or "").strip()
    refs=[]
    if event_id:
        refs.append(f"a1:event:{event_id}")
    source_hash=str(meta.get("source_refs_hash") or "").strip()
    if source_hash:
        refs.append(f"content:source_refs_hash:{source_hash}")

    return evaluate_content_performance(
        content_id=content_id,
        observation_count=independent_snapshot_count,
        confidence_before=confidence_before,
        rule_version_id=rule_version_id,
        expected_economic_value_minor=expected,
        observed_economic_value_minor=observed,
        economic_observation_count=economic_count,
        expected_click_rate_bps=None,
        observed_click_rate_bps=click_rate,
        evidence_refs=tuple(refs),
    )
