#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence

from orchestrator import BrainOpportunityPacket


ROOT=Path(__file__).resolve().parent
A14_DIR=ROOT.parent/"a14"
if str(A14_DIR) not in sys.path:
    sys.path.insert(0,str(A14_DIR))

from brain_bridge import (  # noqa:E402
    A14Policy,
    build_a12_review_payload,
    build_offer_hypothesis,
    build_opportunity_record,
)
from opportunity_engine import EvidenceMetric  # noqa:E402


class A14ProjectionError(ValueError):
    pass


@dataclass(frozen=True)
class A14Preview:
    state: str
    opportunity: Optional[Mapping[str,Any]]
    offer_hypotheses: tuple[Mapping[str,Any],...]
    a12_review_payloads: tuple[Mapping[str,Any],...]
    distribution_matches: tuple[Mapping[str,Any],...]
    reason_codes: tuple[str,...]


def load_a14_policy(path: Path | None=None) -> A14Policy:
    source=path or (A14_DIR/"a14-policy.v1.json")
    raw=json.loads(source.read_text(encoding="utf-8"))
    thresholds=raw["thresholds"]
    return A14Policy(
        policy_version=str(raw["policy_version"]),
        opportunity_weights={str(k):float(v) for k,v in raw["opportunity_weights"].items()},
        distribution_weights={str(k):float(v) for k,v in raw["distribution_weights"].items()},
        minimum_distribution_fit=float(thresholds["minimum_distribution_fit"]),
        minimum_distribution_confidence=float(thresholds["minimum_distribution_confidence"]),
    )


def _evidence_refs(raw: object, scout_refs: Sequence[str]) -> tuple[str,...]:
    if raw == "scout":
        return tuple(sorted(set(str(x) for x in scout_refs if x)))
    if raw is None:
        return ()
    if not isinstance(raw,(list,tuple)):
        raise A14ProjectionError("metric_evidence_refs_must_be_array_or_scout")
    return tuple(sorted(set(str(x) for x in raw if str(x).strip())))


def metrics_from_explicit_config(
    raw: object,
    *,
    scout_evidence_refs: Sequence[str],
) -> dict[str,EvidenceMetric]:
    """Build only explicitly configured A14 metrics.

    No Scout confidence, evidence strength, relation strength, follower count or economic
    value is silently reinterpreted as an A14 score. A known metric must carry its status,
    confidence and provenance, or EvidenceMetric rejects it.
    """
    if raw is None:
        return {}
    if not isinstance(raw,Mapping):
        raise A14ProjectionError("metric_config_must_be_object")
    out={}
    for name,row in raw.items():
        if not isinstance(row,Mapping):
            raise A14ProjectionError(f"metric_{name}_must_be_object")
        status=str(row.get("status","UNKNOWN"))
        value=row.get("value")
        confidence=row.get("confidence")
        refs=_evidence_refs(row.get("evidence_refs"),scout_evidence_refs)
        out[str(name)]=EvidenceMetric(
            None if value is None else float(value),
            status,
            None if confidence is None else float(confidence),
            refs,
        )
    return out


def _territory_config(
    policy_by_territory: Mapping[str,object],
    territory_key: str,
) -> Mapping[str,object]:
    raw=policy_by_territory.get(territory_key,{})
    if raw is None:
        return {}
    if not isinstance(raw,Mapping):
        raise A14ProjectionError("territory_policy_must_be_object")
    return raw


def _offer_mapping(config: Mapping[str,object], key: str, offer_type: str) -> object:
    raw=config.get(key,{})
    if raw is None:
        return None
    if not isinstance(raw,Mapping):
        raise A14ProjectionError(f"{key}_must_be_object")
    return raw.get(offer_type)


def project_packet_to_a14(
    packet: BrainOpportunityPacket,
    *,
    policy_by_territory: Mapping[str,object],
    a14_policy: A14Policy | None=None,
) -> A14Preview:
    if not packet.a14_ready:
        return A14Preview(
            state="brain_packet_not_ready",
            opportunity=None,
            offer_hypotheses=(),
            a12_review_payloads=(),
            distribution_matches=(),
            reason_codes=tuple(dict.fromkeys((*packet.reason_codes,"not_forwarded_to_a14"))),
        )

    policy=a14_policy or load_a14_policy()
    config=_territory_config(policy_by_territory,packet.scout.territory_key)
    opportunity_metrics=metrics_from_explicit_config(
        config.get("opportunity_metrics"),
        scout_evidence_refs=packet.scout.evidence_refs,
    )

    opportunity=build_opportunity_record(
        need_id=packet.scout.need_id,
        territory_code=packet.scout.territory_key,
        metrics=opportunity_metrics,
        evidence_refs=packet.scout.evidence_refs,
        reason_codes=(*packet.reason_codes,"brain_packet_ready_for_a14"),
        existing_solution_ids=packet.scout.existing_solution_ids,
        knowledge_context_refs=packet.scout.knowledge_context_refs,
        rule_version_id=policy.policy_version,
        model_version_id=None,
        policy=policy,
    )

    offers=[]
    reviews=[]
    for concept in packet.offer_concepts:
        fit_raw=_offer_mapping(config,"offer_fit_metrics",concept.offer_type)
        fit_metrics=metrics_from_explicit_config(
            fit_raw,
            scout_evidence_refs=packet.scout.evidence_refs,
        )
        selected=_offer_mapping(config,"existing_solution_by_offer",concept.offer_type)
        if selected is not None:
            selected=str(selected)

        econ_raw=_offer_mapping(config,"economics",concept.offer_type)
        economics=dict(econ_raw) if isinstance(econ_raw,Mapping) else {}
        # Foundry may carry explicit economics already supplied by the caller. Preserve
        # those values as unscored hypothesis metadata; None remains UNKNOWN.
        economics.setdefault("capital_required_minor",concept.capital_required_minor)
        economics.setdefault("human_effort_minutes",concept.human_effort_minutes)

        offer=build_offer_hypothesis(
            opportunity_id=opportunity["opportunity_id"],
            offer_type=concept.offer_type,
            existing_solution_ids=packet.scout.existing_solution_ids,
            existing_solution_id=selected,
            fit_metrics=fit_metrics,
            evidence_refs=packet.scout.evidence_refs,
            reason_codes=concept.reason_codes,
            validation_mode=concept.validation_mode,
            economics=economics,
            policy=policy,
        )
        offers.append(offer)
        reviews.append(build_a12_review_payload(
            opportunity=opportunity,
            offer_hypothesis=offer,
            distribution_match=None,
        ))

    scored=opportunity["opportunity_score"] is not None
    selection_blocked=any(
        "multiple_existing_solutions_require_explicit_selection" in offer["reason_codes"]
        for offer in offers
    )
    reasons=["a14_preview_only","no_persistence","no_execution_authority"]
    if not scored:
        reasons.append("opportunity_dimensions_remain_unknown")
    if packet.scout.need_id is None:
        reasons.append("canonical_need_mapping_missing_or_conflicting")
    if selection_blocked:
        reasons.append("existing_solution_selection_required")
    reasons.append("earned_distribution_waits_for_contextual_amplifier_evidence")

    return A14Preview(
        state="enrichment_required" if (not scored or selection_blocked) else "human_review_preview",
        opportunity=opportunity,
        offer_hypotheses=tuple(offers),
        a12_review_payloads=tuple(reviews),
        distribution_matches=(),
        reason_codes=tuple(reasons),
    )


def preview_to_dict(preview: A14Preview) -> dict[str,Any]:
    return {
        "state":preview.state,
        "opportunity":dict(preview.opportunity) if preview.opportunity is not None else None,
        "offer_hypotheses":[dict(x) for x in preview.offer_hypotheses],
        "a12_review_payloads":[dict(x) for x in preview.a12_review_payloads],
        "distribution_matches":[dict(x) for x in preview.distribution_matches],
        "reason_codes":preview.reason_codes,
    }
