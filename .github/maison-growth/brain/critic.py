#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional, Sequence


@dataclass(frozen=True)
class CriticVerdict:
    status: str
    objections: tuple[str,...]
    missing_evidence: tuple[str,...]
    safe_to_forward: bool
    confidence_cap: Optional[float]


def challenge(
    *,
    evidence_refs: Sequence[str],
    independent_root_count: int,
    existing_solution_ids: Sequence[str],
    claimed_economics: Mapping[str, Optional[int]],
    operational_constraints: Mapping[str, Optional[object]],
    contradiction_refs: Sequence[str]=(),
) -> CriticVerdict:
    objections=[]
    missing=[]

    if not evidence_refs:
        objections.append("no_canonical_evidence")
    if independent_root_count < 2:
        objections.append("insufficient_independent_roots")
    if contradiction_refs:
        objections.append("contradictory_evidence_present")

    for key in ("expected_contribution_minor","capital_required_minor","days_to_cash","human_effort_minutes"):
        if claimed_economics.get(key) is None:
            missing.append(key)

    if existing_solution_ids:
        objections.append("must_compare_existing_assets_before_new_creation")

    for key in ("capacity","stock","legal_or_safety_review","delivery_feasibility"):
        if operational_constraints.get(key) is None:
            missing.append("ops:"+key)

    severe={"no_canonical_evidence","contradictory_evidence_present"}
    safe=not any(x in severe for x in objections)
    status="forward" if safe and not missing else "enrich_or_review"
    cap=None
    if "insufficient_independent_roots" in objections:
        cap=0.59
    if "contradictory_evidence_present" in objections:
        cap=0.39
    return CriticVerdict(
        status=status,
        objections=tuple(objections),
        missing_evidence=tuple(sorted(missing)),
        safe_to_forward=safe,
        confidence_cap=cap,
    )
