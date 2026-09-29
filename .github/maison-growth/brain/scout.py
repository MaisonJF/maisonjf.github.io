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
    acquisition_requirements: tuple[str,...]=()
    reuse_routes: tuple[str,...]=()


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
    acquisition_requirements=()
    reuse_routes=()
    if group.territory_key == "organic_discovery":
        reasons.extend(("organic_acquisition_candidate","zero_cost_first","scale_before_vanity"))
        acquisition_requirements=(
            "attention_evidence","distribution_surface","audience_or_human_signal",
            "identification_trigger","zero_cost_route","maison_destination",
            "scale_or_propagation_mechanism","measurement_plan",
        )
        reuse_routes=(
            "content","game_question","oracle_situation","test_dimension",
            "guide_or_ebook","trend_or_concept","foundry_candidate",
            "seo_opportunity","geo_aeo_answer","social_post","short_video",
            "product_extension","new_product_candidate",
        )
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
        acquisition_requirements=acquisition_requirements,
        reuse_routes=reuse_routes,
    )
