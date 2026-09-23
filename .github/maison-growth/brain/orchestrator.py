#!/usr/bin/env python3
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Iterable, Mapping, Sequence

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
        },
    }
    return normalize_a13_observation(payload)


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
    signals=tuple(row_to_signal(row) for row in rows)
    groups=converge_signals(
        signals,
        similarity_threshold=similarity_threshold,
        minimum_independent_roots=minimum_independent_roots,
    )
    packets=[]
    for group in groups:
        existing=tuple(existing_solutions_by_territory.get(group.territory_key,()))
        contexts=tuple(knowledge_context_by_territory.get(group.territory_key,()))
        offer_types=tuple(candidate_offer_types_by_territory.get(group.territory_key,()))
        scout=discover(
            group,
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
