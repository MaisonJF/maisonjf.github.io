#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional, Sequence


ALLOWED_OFFER_TYPES={
    "physical_product","digital_product","ebook","service","workshop","experience",
    "b2b","wholesale","white_label","licensing","subscription","bundle",
    "partnership","personalisation","corporate_gifting","ip_content_licensing","oracle"
}


@dataclass(frozen=True)
class OfferConcept:
    offer_type: str
    source: str
    existing_solution_ids: tuple[str,...]
    concept_key: str
    validation_mode: str
    capital_required_minor: Optional[int]
    human_effort_minutes: Optional[int]
    reason_codes: tuple[str,...]


def propose(
    *,
    opportunity_key: str,
    candidate_offer_types: Sequence[str],
    existing_solution_ids: Sequence[str],
    economics: Mapping[str, Mapping[str, Optional[int]]],
    validation_modes: Mapping[str,str],
) -> tuple[OfferConcept,...]:
    existing=tuple(sorted(set(existing_solution_ids)))
    out=[]
    for offer_type in dict.fromkeys(candidate_offer_types):
        if offer_type not in ALLOWED_OFFER_TYPES:
            continue
        econ=economics.get(offer_type,{})
        reasons=[]
        source="new_hypothesis"
        if existing:
            source="existing_asset_extension"
            reasons.append("existing_asset_first")
        mode=validation_modes.get(offer_type,"human_review")
        out.append(OfferConcept(
            offer_type=offer_type,
            source=source,
            existing_solution_ids=existing,
            concept_key=f"{opportunity_key}:{offer_type}",
            validation_mode=mode,
            capital_required_minor=econ.get("capital_required_minor"),
            human_effort_minutes=econ.get("human_effort_minutes"),
            reason_codes=tuple(reasons or ["new_offer_requires_validation"]),
        ))
    return tuple(out)
