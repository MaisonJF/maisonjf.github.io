#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Mapping, Optional


class CashValidationError(ValueError):
    pass


@dataclass(frozen=True)
class CashFact:
    conversion_id: str
    economic_assessment_id: str
    revenue_minor: int
    immediate_contribution_minor: int
    currency: str
    created_at: str


@dataclass(frozen=True)
class CashSnapshot:
    realised_revenue_minor: int
    realised_contribution_minor: int
    contributing_conversions: int
    currency: str
    since: str
    status: str = "measured"


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


def compute_cash_snapshot(
    *,
    currency: str,
    since: str,
    assessments: Iterable[CashFact],
) -> CashSnapshot:
    """Measure new money from observed A3 economics only.

    Historical sunk investment is deliberately excluded. If a conversion has
    multiple economics versions, only the newest supplied assessment is counted.
    Forecasts and continuation expected value never count as realised money.
    """
    if len(currency) != 3 or currency != currency.upper():
        raise CashValidationError("currency must be uppercase 3-letter code")
    _parse_time(since)

    latest: dict[str, CashFact] = {}
    for fact in assessments:
        if fact.currency != currency:
            raise CashValidationError("assessment currency mismatch")
        current=latest.get(fact.conversion_id)
        if current is None or _parse_time(fact.created_at) > _parse_time(current.created_at):
            latest[fact.conversion_id]=fact

    return CashSnapshot(
        realised_revenue_minor=sum(f.revenue_minor for f in latest.values()),
        realised_contribution_minor=sum(f.immediate_contribution_minor for f in latest.values()),
        contributing_conversions=len(latest),
        currency=currency,
        since=since,
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
    """Rank evidence-backed opportunities for near-term cash generation.

    This is prioritisation, not a revenue forecast. Missing values stay UNKNOWN.
    Policy weights/scales are explicit caller configuration and should be revised
    from A11 observed outcomes rather than treated as business facts.
    """
    if not 0 <= candidate.confidence <= 1:
        raise CashValidationError("confidence must be 0..1")
    if min(max_days_to_cash,max_capital_minor,contribution_scale_minor,human_minutes_scale) <= 0:
        raise CashValidationError("policy scales must be positive")
    required={"contribution","speed","capital","human_effort"}
    if set(weights) != required or any(float(v) < 0 for v in weights.values()) or sum(float(v) for v in weights.values()) <= 0:
        raise CashValidationError("cash weights must contain contribution/speed/capital/human_effort with non-negative positive-total values")

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
        raise CashValidationError("cash inputs must be non-negative")

    contribution=min(candidate.expected_contribution_minor/contribution_scale_minor,1.0)
    speed=max(0.0,1.0-(candidate.days_to_cash/max_days_to_cash))
    capital=max(0.0,1.0-(candidate.capital_required_minor/max_capital_minor))
    effort=max(0.0,1.0-(candidate.human_effort_minutes/human_minutes_scale))

    total=sum(float(v) for v in weights.values())
    raw=(
        float(weights["contribution"])*contribution
        + float(weights["speed"])*speed
        + float(weights["capital"])*capital
        + float(weights["human_effort"])*effort
    ) / total
    raw *= candidate.confidence
    return CashPriorityResult(
        candidate.opportunity_id,round(raw*100,2),"rankable",
        ("cash_profit_mode","evidence_backed_cash_priority"),
    )
