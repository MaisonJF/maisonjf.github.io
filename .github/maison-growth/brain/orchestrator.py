#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Iterable, Mapping, Optional, Sequence

from critic import CriticVerdict, challenge
from foundry import OfferConcept, propose
from prebrain import Signal, SignalGroup, converge_signals, normalize_a13_observation
from scout import ScoutOpportunity, discover


@dataclass(frozen=True)
class BrainOpportunityPacket:
    scout: ScoutOpportunity
    critic: CriticVerdict
    offer_concepts: tuple[OfferConcept,...]
    a14_ready: bool
    reason_codes: tuple[str,...]


def row_to_signal(row: Mapping[str,object]) -> Signal:
    roots=row.get("independent_roots",())
    if isinstance(roots,str):
        roots=tuple(json.loads(roots))
    evidence=row.get("evidence_refs",())
    if isinstance(evidence,str):
        evidence=tuple(json.loads(evidence))
    payload={
        "observation_id":row["observation_id"],
        "territory_key":row["territory_key"],
        "source_class":row["source_class"],
        "response_excerpt":row["response_excerpt"],
        "observed_at":row["observed_at"],
        "confidence":row.get("confidence",0.0),
        "independent_roots":roots,
        "evidence_refs":evidence,
        "metadata":{
            "provider_id":row.get("provider_id"),
            "model_id":row.get("model_id"),
            "grounding_state":row.get("grounding_state"),
            "semantic_observation_id":row.get("semantic_observation_id"),
            "need_id":row.get("need_id"),
            "intent_id":row.get("intent_id"),
            "semantic_confidence_score":row.get("semantic_confidence_score"),
            "semantic_ambiguity":row.get("semantic_ambiguity"),
        },
    }
    return normalize_a13_observation(payload)


def _resolve_a5_mapping(
    group: SignalGroup,
    rows_by_signal_id: Mapping[str,Mapping[str,object]],
) -> tuple[Optional[str],Optional[str],tuple[str,...]]:
    mapped=[]
    for signal_id in group.signal_ids:
        row=rows_by_signal_id.get(signal_id,{})
        if int(row.get("semantic_ambiguity") or 0) != 0:
            continue
        need_id=str(row.get("need_id") or "").strip() or None
        intent_id=str(row.get("intent_id") or "").strip() or None
        if need_id or intent_id:
            mapped.append((need_id,intent_id))

    need_ids={need for need,_ in mapped if need}
    intent_ids={intent for _,intent in mapped if intent}
    reasons=[]

    need_id=None
    if len(need_ids)==1:
        need_id=next(iter(need_ids))
        reasons.append("a5_need_mapping_resolved")
    elif len(need_ids)>1:
        reasons.append("a5_need_mapping_conflict")
    else:
        reasons.append("a5_need_mapping_unavailable")

    intent_id=None
    if len(intent_ids)==1:
        intent_id=next(iter(intent_ids))
        reasons.append("a5_intent_mapping_resolved")
    elif len(intent_ids)>1:
        reasons.append("a5_intent_mapping_conflict")

    return need_id,intent_id,tuple(reasons)


def run_brain_cycle(
    *,
    rows: Iterable[Mapping[str,object]],
    similarity_threshold: float,
    minimum_independent_roots: int,
    scout_minimum_confidence: float,
    existing_solutions_by_territory: Mapping[str,Sequence[str]],
    knowledge_context_by_territory: Mapping[str,Sequence[str]],
    candidate_offer_types_by_territory: Mapping[str,Sequence[str]],
    economics_by_territory: Mapping[str,Mapping[str,Mapping[str,int|None]]],
    validation_modes: Mapping[str,str],
    operational_constraints_by_territory: Mapping[str,Mapping[str,object|None]],
) -> tuple[BrainOpportunityPacket,...]:
    materialized_rows=tuple(dict(row) for row in rows)
    rows_by_signal_id={
        str(row.get("observation_id")):row
        for row in materialized_rows
        if row.get("observation_id")
    }
    signals=tuple(row_to_signal(row) for row in materialized_rows)
    groups=converge_signals(
        signals,
        similarity_threshold=similarity_threshold,
        minimum_independent_roots=minimum_independent_roots,
    )
    packets=[]
    for group in groups:
        need_id,intent_id,mapping_reasons=_resolve_a5_mapping(group,rows_by_signal_id)
        existing=tuple(existing_solutions_by_territory.get(group.territory_key,()))
        contexts=tuple(knowledge_context_by_territory.get(group.territory_key,()))
        offer_types=tuple(candidate_offer_types_by_territory.get(group.territory_key,()))
        scout=discover(
            group,
            need_id=need_id,
            intent_id=intent_id,
            mapping_reason_codes=mapping_reasons,
            existing_solution_ids=existing,
            knowledge_context_refs=contexts,
            candidate_offer_types=offer_types,
            minimum_confidence=scout_minimum_confidence,
        )
        economics=economics_by_territory.get(group.territory_key,{})
        flattened={
            "expected_contribution_minor":None,
            "capital_required_minor":None,
            "days_to_cash":None,
            "human_effort_minutes":None,
        }
        known_econ=[v for v in economics.values() if isinstance(v,Mapping)]
        for key in tuple(flattened):
            values=[v.get(key) for v in known_econ if v.get(key) is not None]
            if values:
                flattened[key]=max(values) if key=="expected_contribution_minor" else min(values)
        critic=challenge(
            evidence_refs=scout.evidence_refs,
            independent_root_count=len(scout.independent_roots),
            existing_solution_ids=existing,
            claimed_economics=flattened,
            operational_constraints=operational_constraints_by_territory.get(group.territory_key,{}),
        )
        concepts=()
        if critic.safe_to_forward:
            concepts=propose(
                opportunity_key=scout.scout_id,
                candidate_offer_types=scout.candidate_offer_types,
                existing_solution_ids=scout.existing_solution_ids,
                economics=economics,
                validation_modes=validation_modes,
            )
        ready=scout.status=="candidate" and critic.safe_to_forward and bool(concepts)
        reasons=list(scout.reason_codes)+list(critic.objections)
        if ready: reasons.append("ready_for_a14_assessment")
        packets.append(BrainOpportunityPacket(
            scout=scout,
            critic=critic,
            offer_concepts=concepts,
            a14_ready=ready,
            reason_codes=tuple(dict.fromkeys(reasons)),
        ))
    return tuple(packets)


def packet_to_dict(packet: BrainOpportunityPacket) -> dict:
    return {
        "scout":asdict(packet.scout),
        "critic":asdict(packet.critic),
        "offer_concepts":[asdict(x) for x in packet.offer_concepts],
        "a14_ready":packet.a14_ready,
        "reason_codes":packet.reason_codes,
    }
