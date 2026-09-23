#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional, Sequence

from prebrain import SignalGroup


class ScoutError(ValueError):
    pass


@dataclass(frozen=True)
class ScoutOpportunity:
    scout_id: str
    territory_key: str
    need_id: Optional[str]
    intent_id: Optional[str]
    need_summary: str
    evidence_refs: tuple[str,...]
    independent_roots: tuple[str,...]
    existing_solution_ids: tuple[str,...]
    knowledge_context_refs: tuple[str,...]
    candidate_offer_types: tuple[str,...]
    confidence: float
    status: str
    reason_codes: tuple[str,...]


def discover(
    group: SignalGroup,
    *,
    need_id: Optional[str]=None,
    intent_id: Optional[str]=None,
    mapping_reason_codes: Sequence[str]=(),
    existing_solution_ids: Sequence[str],
    knowledge_context_refs: Sequence[str],
    candidate_offer_types: Sequence[str],
    minimum_confidence: float,
) -> ScoutOpportunity:
    if not 0 <= minimum_confidence <= 1:
        raise ScoutError("invalid_minimum_confidence")
    reasons=["external_signal_convergence",*mapping_reason_codes]
    existing=tuple(sorted(set(existing_solution_ids)))
    contexts=tuple(sorted(set(knowledge_context_refs)))
    if existing:
        reasons.append("existing_asset_first")
    if any(ref.startswith("asset:") for ref in contexts):
        reasons.append("existing_catalogue_asset_context")
    if len(group.independent_roots) < 2:
        reasons.append("weak_source_independence")
    status="observe"
    if group.confidence >= minimum_confidence and group.evidence_refs:
        status="candidate"
    return ScoutOpportunity(
        scout_id="sct_"+group.group_id.removeprefix("pbg_"),
        territory_key=group.territory_key,
        need_id=need_id,
        intent_id=intent_id,
        need_summary=group.representative_text,
        evidence_refs=group.evidence_refs,
        independent_roots=group.independent_roots,
        existing_solution_ids=existing,
        knowledge_context_refs=contexts,
        candidate_offer_types=tuple(dict.fromkeys(candidate_offer_types)),
        confidence=group.confidence,
        status=status,
        reason_codes=tuple(reasons),
    )
