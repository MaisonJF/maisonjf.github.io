#!/usr/bin/env python3
from __future__ import annotations

import unittest

from opportunity_engine import (
    A14ValidationError,
    EvidenceMetric,
    MoneyMetric,
    choose_offer_path,
    compute_activation_economics,
    map_offer_to_a3_solution_type,
    recommend_activation,
    score_distribution_fit,
    score_universal_opportunity,
)


def m(value, confidence=1.0, ref="evd_test"):
    return EvidenceMetric(value, "OBSERVED", confidence, (ref,))


def eur(value, confidence=1.0, ref="evd_money"):
    return MoneyMetric(value, "EUR", "OBSERVED", confidence, (ref,), "observed_or_configured")


class A14Tests(unittest.TestCase):
    def test_unknown_is_not_filled_with_midpoint(self):
        result = score_universal_opportunity({"demand": m(90)})
        self.assertEqual(result.score, 90.0)
        self.assertLess(result.confidence, 0.2)
        self.assertIn("willingness_to_pay", result.unknown_dimensions)

    def test_known_metric_requires_evidence(self):
        with self.assertRaises(A14ValidationError):
            EvidenceMetric(80, "OBSERVED", 0.8, ())

    def test_no_evidence_means_no_score(self):
        result = score_distribution_fit({})
        self.assertIsNone(result.score)
        self.assertEqual(result.confidence, 0.0)

    def test_distribution_fit_excludes_cost(self):
        result = score_distribution_fit({
            "topic_fit": m(95),
            "audience_relevance": m(90),
            "community_quality": m(85),
        })
        self.assertGreater(result.score, 85)
        self.assertIn("aesthetic_fit", result.unknown_dimensions)

    def test_existing_asset_first(self):
        result = choose_offer_path(("sol_existing",), ("physical_product",))
        self.assertEqual(result["path"], "reuse_existing_first")
        self.assertEqual(result["new_offer_types"], ())

    def test_rich_offer_maps_to_existing_a3_type(self):
        self.assertEqual(map_offer_to_a3_solution_type("wholesale"), "b2b")
        self.assertEqual(map_offer_to_a3_solution_type("experience"), "service")
        self.assertEqual(map_offer_to_a3_solution_type("digital_product"), "future_product")

    def test_unknown_economics_remain_unknown(self):
        economics = compute_activation_economics(
            direct_cost=eur(950),
            expected_direct_revenue=MoneyMetric(None),
            expected_direct_margin=MoneyMetric(None),
            monetized_indirect_value=MoneyMetric(None),
        )
        self.assertIsNone(economics.net_direct_expected_value_minor)
        self.assertIsNone(economics.net_total_expected_value_minor)
        self.assertIn("expected_direct_margin", economics.unknown_fields)

    def test_direct_and_total_ev_only_when_supported(self):
        economics = compute_activation_economics(
            direct_cost=eur(950),
            expected_direct_revenue=eur(5000),
            expected_direct_margin=eur(3000),
            monetized_indirect_value=eur(400),
        )
        self.assertEqual(economics.net_direct_expected_value_minor, 2050)
        self.assertEqual(economics.net_total_expected_value_minor, 2450)

    def test_high_fit_unknown_economics_prefers_zero_cash(self):
        fit = score_distribution_fit({k: m(90) for k in (
            "topic_fit","audience_relevance","community_quality","trust","growth",
            "low_commercial_saturation","aesthetic_fit","story_strength",
            "response_likelihood","brand_safety","commercial_potential","recurrence_potential"
        )})
        economics = compute_activation_economics(
            direct_cost=eur(950),
            expected_direct_revenue=MoneyMetric(None),
            expected_direct_margin=MoneyMetric(None),
            monetized_indirect_value=MoneyMetric(None),
        )
        rec = recommend_activation(
            fit=fit, economics=economics, minimum_fit=70, minimum_confidence=0.6,
            channel_class="creator", seedable=True,
        )
        self.assertEqual(rec.strategy, "zero_cash_story")
        self.assertFalse(rec.outbound_authorized)
        self.assertFalse(rec.spend_authorized)

    def test_seeding_requires_evidence_backed_positive_total_ev(self):
        fit = score_distribution_fit({k: m(90) for k in (
            "topic_fit","audience_relevance","community_quality","trust","growth",
            "low_commercial_saturation","aesthetic_fit","story_strength",
            "response_likelihood","brand_safety","commercial_potential","recurrence_potential"
        )})
        economics = compute_activation_economics(
            direct_cost=eur(900),
            expected_direct_revenue=eur(5000),
            expected_direct_margin=eur(2500),
            monetized_indirect_value=eur(0),
        )
        rec = recommend_activation(
            fit=fit, economics=economics, minimum_fit=70, minimum_confidence=0.6,
            channel_class="creator", seedable=True,
        )
        self.assertEqual(rec.strategy, "product_seeding")
        self.assertTrue(rec.requires_a12_review)
        self.assertFalse(rec.spend_authorized)

    def test_b2b_recommendation_still_has_no_execution_authority(self):
        fit = score_distribution_fit({k: m(90) for k in (
            "topic_fit","audience_relevance","community_quality","trust","growth",
            "low_commercial_saturation","aesthetic_fit","story_strength",
            "response_likelihood","brand_safety","commercial_potential","recurrence_potential"
        )})
        economics = compute_activation_economics(
            direct_cost=MoneyMetric(None), expected_direct_revenue=MoneyMetric(None),
            expected_direct_margin=MoneyMetric(None), monetized_indirect_value=MoneyMetric(None),
        )
        rec = recommend_activation(
            fit=fit, economics=economics, minimum_fit=70, minimum_confidence=0.6,
            channel_class="b2b", seedable=False,
        )
        self.assertEqual(rec.strategy, "b2b")
        self.assertFalse(rec.outbound_authorized)


if __name__ == "__main__":
    unittest.main(verbosity=2)
