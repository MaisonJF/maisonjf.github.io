#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Mapping, Optional


class RecoveryValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ContributionFact:
    conversion_id: str
    economic_assessment_id: str
    immediate_contribution_minor: int
    currency: str
    created_at: str


@dataclass(frozen=True)
class RecoverySnapshot:
    target_minor: int
    recovered_contribution_minor: int
    remaining_minor: int
    progress_ratio: float
    contributing_conversions: int
    currency: str
    status: str


@dataclass(frozen=True)
class CashOpportunity:
    opportunity_id: str
    expected_contribution_minor: Optional[int]
    capital_required_minor: Optional[int]
    days_to_cash: Optional[int]
    human_effort_minutes: Optional[int]
    confidence: float


@dataclass(frozen=True)
class CashPriorityResult:
    opportunity_id: str
    priority_score: Optional[float]
    state: str
    reason_codes: tuple[str, ...]


def _parse_time(value: str) -> datetime:
    raw=value[:-1] + "+00:00" if value.endswith("Z") else value
    return datetime.fromisoformat(raw)


def compute_recovery_snapshot(
    *,
    target_minor: int,
    currency: str,
    assessments: Iterable[ContributionFact],
) -> RecoverySnapshot:
    """Measure capital recovery from observed A3 immediate contribution only.

    If a conversion has multiple economics versions, only the newest supplied
    assessment is counted. Forecasts and expected continuation value are excluded.
    """
    if target_minor <= 0:
        raise RecoveryValidationError("target_minor must be positive")
    if len(currency) != 3 or currency != currency.upper():
        raise RecoveryValidationError("currency must be uppercase 3-letter code")

    latest: dict[str, ContributionFact] = {}
    for fact in assessments:
        if fact.currency != currency:
            raise RecoveryValidationError("assessment currency mismatch")
        current=latest.get(fact.conversion_id)
        if current is None or _parse_time(fact.created_at) > _parse_time(current.created_at):
            latest[fact.conversion_id]=fact

    recovered=sum(f.immediate_contribution_minor for f in latest.values())
    remaining=max(target_minor-recovered,0)
    ratio=max(recovered,0)/target_minor
    return RecoverySnapshot(
        target_minor=target_minor,
        recovered_contribution_minor=recovered,
        remaining_minor=remaining,
        progress_ratio=round(ratio,6),
        contributing_conversions=len(latest),
        currency=currency,
        status="recovered" if recovered >= target_minor else "recovering",
    )


def cash_priority(
    candidate: CashOpportunity,
    *,
    max_days_to_cash: int,
    max_capital_minor: int,
    contribution_scale_minor: int,
    human_minutes_scale: int,
    weights: Mapping[str, float],
) -> CashPriorityResult:
    """Rank fast-cash hypotheses only when the required commercial evidence exists.

    This is a prioritisation aid, not a revenue forecast. All policy scales are
    explicit caller configuration rather than hidden Maison constants.
    """
    if not 0 <= candidate.confidence <= 1:
        raise RecoveryValidationError("confidence must be 0..1")
    if min(max_days_to_cash,max_capital_minor,contribution_scale_minor,human_minutes_scale) <= 0:
        raise RecoveryValidationError("policy scales must be positive")
    required_weights={"contribution","speed","capital","human_effort"}
    if set(weights) != required_weights or any(float(v) < 0 for v in weights.values()) or sum(float(v) for v in weights.values()) <= 0:
        raise RecoveryValidationError("recovery weights must contain contribution/speed/capital/human_effort with non-negative positive-total values")

    missing=[]
    if candidate.expected_contribution_minor is None: missing.append("expected_contribution_minor")
    if candidate.capital_required_minor is None: missing.append("capital_required_minor")
    if candidate.days_to_cash is None: missing.append("days_to_cash")
    if candidate.human_effort_minutes is None: missing.append("human_effort_minutes")
    if missing:
        return CashPriorityResult(
            candidate.opportunity_id,None,"enrich_data",
            tuple(["missing_evidence"] + sorted(missing)),
        )

    if candidate.days_to_cash < 0 or candidate.capital_required_minor < 0 or candidate.human_effort_minutes < 0:
        raise RecoveryValidationError("cash inputs must be non-negative")

    contribution=min(candidate.expected_contribution_minor/contribution_scale_minor,1.0)
    speed=max(0.0,1.0-(candidate.days_to_cash/max_days_to_cash))
    capital=max(0.0,1.0-(candidate.capital_required_minor/max_capital_minor))
    effort=max(0.0,1.0-(candidate.human_effort_minutes/human_minutes_scale))

    total_weight=sum(float(v) for v in weights.values())
    raw=(
        float(weights["contribution"])*contribution
        + float(weights["speed"])*speed
        + float(weights["capital"])*capital
        + float(weights["human_effort"])*effort
    ) / total_weight
    raw *= candidate.confidence
    return CashPriorityResult(
        candidate.opportunity_id,round(raw*100,2),"rankable",
        ("recovery_mode","evidence_backed_cash_priority"),
    )
