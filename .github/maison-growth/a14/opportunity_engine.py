#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Optional, Sequence

METRIC_STATUSES = {"UNKNOWN", "OBSERVED", "INFERRED", "ESTIMATED", "VERIFIED"}

OFFER_TO_A3 = {
    "physical_product": "physical_product",
    "digital_product": "future_product",
    "ebook": "ebook",
    "service": "service",
    "workshop": "service",
    "experience": "service",
    "b2b": "b2b",
    "wholesale": "b2b",
    "white_label": "b2b",
    "licensing": "b2b",
    "subscription": "future_product",
    "bundle": "future_product",
    "partnership": "b2b",
    "personalisation": "future_product",
    "corporate_gifting": "b2b",
    "ip_content_licensing": "b2b",
    "oracle": "oracle",
}

INITIAL_OPPORTUNITY_WEIGHTS = {
    "demand": 0.16,
    "growth": 0.08,
    "need_intensity": 0.10,
    "willingness_to_pay": 0.12,
    "differentiation": 0.10,
    "margin_potential": 0.10,
    "time_to_cash": 0.08,
    "repeatability": 0.08,
    "maison_fit": 0.12,
    "operational_viability": 0.06,
}

INITIAL_DISTRIBUTION_WEIGHTS = {
    "topic_fit": 0.16,
    "audience_relevance": 0.13,
    "community_quality": 0.10,
    "trust": 0.08,
    "growth": 0.05,
    "low_commercial_saturation": 0.06,
    "aesthetic_fit": 0.08,
    "story_strength": 0.10,
    "response_likelihood": 0.05,
    "brand_safety": 0.08,
    "commercial_potential": 0.07,
    "recurrence_potential": 0.04,
}


class A14ValidationError(ValueError):
    pass


@dataclass(frozen=True)
class EvidenceMetric:
    value: Optional[float]
    status: str = "UNKNOWN"
    confidence: Optional[float] = None
    evidence_refs: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if self.status not in METRIC_STATUSES:
            raise A14ValidationError("unsupported metric status")
        if self.value is not None and not 0.0 <= self.value <= 100.0:
            raise A14ValidationError("score metrics must be 0..100")
        if self.confidence is not None and not 0.0 <= self.confidence <= 1.0:
            raise A14ValidationError("confidence must be 0..1")
        if self.status == "UNKNOWN" and self.value is not None:
            raise A14ValidationError("UNKNOWN metric cannot carry a value")
        if self.status != "UNKNOWN" and self.value is not None and not self.evidence_refs:
            raise A14ValidationError("known metric requires evidence_refs")

    @property
    def known(self) -> bool:
        return self.status != "UNKNOWN" and self.value is not None and self.confidence is not None


@dataclass(frozen=True)
class ScoreResult:
    score: Optional[float]
    confidence: float
    known_dimensions: tuple[str, ...]
    unknown_dimensions: tuple[str, ...]
    evidence_refs: tuple[str, ...]


@dataclass(frozen=True)
class MoneyMetric:
    value_minor: Optional[int]
    currency: str = "EUR"
    status: str = "UNKNOWN"
    confidence: Optional[float] = None
    evidence_refs: tuple[str, ...] = ()
    method: Optional[str] = None

    def __post_init__(self) -> None:
        if self.status not in METRIC_STATUSES:
            raise A14ValidationError("unsupported money metric status")
        if len(self.currency) != 3 or self.currency != self.currency.upper():
            raise A14ValidationError("currency must be uppercase 3-letter code")
        if self.value_minor is not None and self.value_minor < 0:
            raise A14ValidationError("money values must be non-negative")
        if self.confidence is not None and not 0.0 <= self.confidence <= 1.0:
            raise A14ValidationError("confidence must be 0..1")
        if self.status == "UNKNOWN" and self.value_minor is not None:
            raise A14ValidationError("UNKNOWN money metric cannot carry a value")
        if self.status != "UNKNOWN" and self.value_minor is not None and not self.evidence_refs:
            raise A14ValidationError("known money metric requires evidence_refs")

    @property
    def known(self) -> bool:
        return self.status != "UNKNOWN" and self.value_minor is not None and self.confidence is not None


@dataclass(frozen=True)
class ActivationEconomics:
    direct_cost_minor: Optional[int]
    expected_direct_revenue_minor: Optional[int]
    expected_direct_margin_minor: Optional[int]
    monetized_indirect_value_minor: Optional[int]
    net_direct_expected_value_minor: Optional[int]
    net_total_expected_value_minor: Optional[int]
    confidence: float
    unknown_fields: tuple[str, ...]


@dataclass(frozen=True)
class ActivationRecommendation:
    strategy: str
    state: str
    reason_codes: tuple[str, ...]
    requires_a12_review: bool = True
    outbound_authorized: bool = False
    spend_authorized: bool = False


def _score(metrics: Mapping[str, EvidenceMetric], weights: Mapping[str, float]) -> ScoreResult:
    unknown = []
    known = []
    weighted_sum = 0.0
    applied_weight = 0.0
    evidence = set()

    extra = set(metrics) - set(weights)
    if extra:
        raise A14ValidationError(f"unsupported dimensions: {', '.join(sorted(extra))}")

    for name, weight in weights.items():
        metric = metrics.get(name, EvidenceMetric(None))
        if not metric.known:
            unknown.append(name)
            continue
        contribution_weight = weight * float(metric.confidence)
        weighted_sum += float(metric.value) * contribution_weight
        applied_weight += contribution_weight
        known.append(name)
        evidence.update(metric.evidence_refs)

    if applied_weight == 0:
        return ScoreResult(None, 0.0, (), tuple(sorted(unknown)), ())

    score = weighted_sum / applied_weight
    max_weight = sum(weights.values())
    confidence = applied_weight / max_weight if max_weight else 0.0
    return ScoreResult(
        round(score, 2),
        round(min(confidence, 1.0), 4),
        tuple(sorted(known)),
        tuple(sorted(unknown)),
        tuple(sorted(evidence)),
    )


def score_universal_opportunity(
    metrics: Mapping[str, EvidenceMetric],
    weights: Mapping[str, float],
) -> ScoreResult:
    """Evidence-weighted opportunity score using an explicit versioned policy."""
    return _score(metrics, weights)


def score_distribution_fit(
    metrics: Mapping[str, EvidenceMetric],
    weights: Mapping[str, float],
) -> ScoreResult:
    """Contextual Amplifier × Offer × Moment fit; weights are explicit policy, not facts."""
    return _score(metrics, weights)


def map_offer_to_a3_solution_type(offer_type: str) -> str:
    try:
        return OFFER_TO_A3[offer_type]
    except KeyError as exc:
        raise A14ValidationError("unsupported offer_type") from exc


def choose_offer_path(existing_solution_ids: Sequence[str], proposed_offer_types: Sequence[str]) -> dict:
    """Existing assets are evaluated before a new offer hypothesis is allowed."""
    existing = tuple(sorted(set(str(x) for x in existing_solution_ids if str(x).strip())))
    if existing:
        return {
            "path": "reuse_existing_first",
            "existing_solution_ids": existing,
            "new_offer_types": (),
            "reason_codes": ("existing_asset_first",),
        }
    valid = tuple(dict.fromkeys(proposed_offer_types))
    for offer_type in valid:
        map_offer_to_a3_solution_type(offer_type)
    return {
        "path": "new_offer_hypothesis",
        "existing_solution_ids": (),
        "new_offer_types": valid,
        "reason_codes": ("no_existing_solution_supplied", "human_review_required"),
    }


def compute_activation_economics(
    *,
    direct_cost: MoneyMetric,
    expected_direct_revenue: MoneyMetric,
    expected_direct_margin: MoneyMetric,
    monetized_indirect_value: MoneyMetric,
) -> ActivationEconomics:
    """Calculate only what the evidence supports.

    Non-monetary distribution effects belong in observation records. They are not converted to EUR here
    unless a separate evidence-backed valuation has already produced monetized_indirect_value.
    """
    currencies = {
        x.currency
        for x in (direct_cost, expected_direct_revenue, expected_direct_margin, monetized_indirect_value)
        if x.known
    }
    if len(currencies) > 1:
        raise A14ValidationError("known economics inputs must use one currency")

    unknown = []
    for name, metric in (
        ("direct_cost", direct_cost),
        ("expected_direct_revenue", expected_direct_revenue),
        ("expected_direct_margin", expected_direct_margin),
        ("monetized_indirect_value", monetized_indirect_value),
    ):
        if not metric.known:
            unknown.append(name)

    net_direct = None
    if direct_cost.known and expected_direct_margin.known:
        net_direct = int(expected_direct_margin.value_minor) - int(direct_cost.value_minor)

    net_total = None
    if net_direct is not None and monetized_indirect_value.known:
        net_total = net_direct + int(monetized_indirect_value.value_minor)

    known_confidences = [
        float(x.confidence)
        for x in (direct_cost, expected_direct_revenue, expected_direct_margin, monetized_indirect_value)
        if x.known
    ]
    confidence = sum(known_confidences) / 4.0 if known_confidences else 0.0

    return ActivationEconomics(
        direct_cost_minor=direct_cost.value_minor if direct_cost.known else None,
        expected_direct_revenue_minor=expected_direct_revenue.value_minor if expected_direct_revenue.known else None,
        expected_direct_margin_minor=expected_direct_margin.value_minor if expected_direct_margin.known else None,
        monetized_indirect_value_minor=monetized_indirect_value.value_minor if monetized_indirect_value.known else None,
        net_direct_expected_value_minor=net_direct,
        net_total_expected_value_minor=net_total,
        confidence=round(confidence, 4),
        unknown_fields=tuple(sorted(unknown)),
    )


def recommend_activation(
    *,
    fit: ScoreResult,
    economics: ActivationEconomics,
    minimum_fit: float,
    minimum_confidence: float,
    channel_class: str,
    seedable: bool,
) -> ActivationRecommendation:
    """Produce an internal recommendation using caller-supplied policy thresholds.

    Thresholds are deliberately not hard-coded as Maison facts. A12/policy supplies them.
    """
    if not 0 <= minimum_fit <= 100 or not 0 <= minimum_confidence <= 1:
        raise A14ValidationError("invalid policy thresholds")

    if fit.score is None or fit.confidence < minimum_confidence:
        return ActivationRecommendation(
            "observe", "enrich_data",
            ("insufficient_evidence", "unknowns_reduce_confidence", "a12_review_required"),
        )

    if fit.score < minimum_fit:
        return ActivationRecommendation(
            "no_action", "observe",
            ("fit_below_policy_threshold", "a12_review_required"),
        )

    if channel_class == "b2b":
        return ActivationRecommendation(
            "b2b", "recommend",
            ("strong_contextual_fit", "b2b_channel", "a12_review_required"),
        )

    if seedable and economics.net_total_expected_value_minor is not None and economics.net_total_expected_value_minor > 0:
        return ActivationRecommendation(
            "product_seeding", "recommend",
            ("strong_contextual_fit", "evidence_backed_positive_total_ev", "a12_review_required"),
        )

    return ActivationRecommendation(
        "zero_cash_story", "recommend",
        ("strong_contextual_fit", "economics_not_sufficient_for_spend", "prefer_zero_cash", "a12_review_required"),
    )
