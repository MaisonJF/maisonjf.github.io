#!/usr/bin/env python3
from __future__ import annotations

import unittest

from recovery_engine import (
    CashOpportunity,
    ContributionFact,
    RecoveryValidationError,
    cash_priority,
    compute_recovery_snapshot,
)


class RecoveryEngineTests(unittest.TestCase):
    def test_recovery_uses_observed_contribution_not_revenue(self):
        facts=[
            ContributionFact("cnv_a","eva_1",7000,"EUR","2026-09-23T10:00:00Z"),
            ContributionFact("cnv_b","eva_2",3000,"EUR","2026-09-23T11:00:00Z"),
        ]
        snap=compute_recovery_snapshot(target_minor=20000,currency="EUR",assessments=facts)
        self.assertEqual(snap.recovered_contribution_minor,10000)
        self.assertEqual(snap.remaining_minor,10000)
        self.assertEqual(snap.progress_ratio,0.5)

    def test_latest_assessment_per_conversion_prevents_double_count(self):
        facts=[
            ContributionFact("cnv_a","eva_old",7000,"EUR","2026-09-23T10:00:00Z"),
            ContributionFact("cnv_a","eva_new",8000,"EUR","2026-09-23T12:00:00Z"),
        ]
        snap=compute_recovery_snapshot(target_minor=20000,currency="EUR",assessments=facts)
        self.assertEqual(snap.recovered_contribution_minor,8000)
        self.assertEqual(snap.contributing_conversions,1)

    def test_negative_contribution_can_reduce_recovery(self):
        facts=[
            ContributionFact("cnv_a","eva_1",5000,"EUR","2026-09-23T10:00:00Z"),
            ContributionFact("cnv_b","eva_2",-1000,"EUR","2026-09-23T11:00:00Z"),
        ]
        snap=compute_recovery_snapshot(target_minor=20000,currency="EUR",assessments=facts)
        self.assertEqual(snap.recovered_contribution_minor,4000)

    def test_cash_priority_refuses_to_invent_missing_values(self):
        result=cash_priority(
            CashOpportunity("opp_x",None,500,3,60,0.8),
            max_days_to_cash=30,max_capital_minor=10000,
            contribution_scale_minor=50000,human_minutes_scale=600,
        )
        self.assertIsNone(result.priority_score)
        self.assertEqual(result.state,"enrich_data")

    def test_fast_low_capital_high_contribution_ranks_high(self):
        result=cash_priority(
            CashOpportunity("opp_x",40000,1000,2,60,0.9),
            max_days_to_cash=30,max_capital_minor=10000,
            contribution_scale_minor=50000,human_minutes_scale=600,
        )
        self.assertGreater(result.priority_score,70)

    def test_currency_mismatch_rejected(self):
        with self.assertRaises(RecoveryValidationError):
            compute_recovery_snapshot(
                target_minor=20000,currency="EUR",
                assessments=[ContributionFact("c","e",100,"USD","2026-09-23T10:00:00Z")],
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
