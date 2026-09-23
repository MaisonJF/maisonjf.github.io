#!/usr/bin/env python3
from __future__ import annotations

import unittest

from cash_engine import (
    CashFact,
    CashOpportunity,
    CashValidationError,
    cash_priority,
    compute_cash_snapshot,
)


W={"contribution":.4,"speed":.3,"capital":.2,"human_effort":.1}


class CashEngineTests(unittest.TestCase):
    def test_snapshot_measures_new_realised_money(self):
        facts=[
            CashFact("cnv_a","eva_1",10000,7000,"EUR","2026-09-23T10:00:00Z"),
            CashFact("cnv_b","eva_2",5000,3000,"EUR","2026-09-23T11:00:00Z"),
        ]
        snap=compute_cash_snapshot(currency="EUR",since="2026-09-23T00:00:00Z",assessments=facts)
        self.assertEqual(snap.realised_revenue_minor,15000)
        self.assertEqual(snap.realised_contribution_minor,10000)
        self.assertEqual(snap.contributing_conversions,2)

    def test_latest_assessment_prevents_double_count(self):
        facts=[
            CashFact("cnv_a","eva_old",10000,7000,"EUR","2026-09-23T10:00:00Z"),
            CashFact("cnv_a","eva_new",10000,8000,"EUR","2026-09-23T12:00:00Z"),
        ]
        snap=compute_cash_snapshot(currency="EUR",since="2026-09-23T00:00:00Z",assessments=facts)
        self.assertEqual(snap.realised_revenue_minor,10000)
        self.assertEqual(snap.realised_contribution_minor,8000)
        self.assertEqual(snap.contributing_conversions,1)

    def test_negative_contribution_is_not_hidden(self):
        facts=[
            CashFact("cnv_a","eva_1",5000,5000,"EUR","2026-09-23T10:00:00Z"),
            CashFact("cnv_b","eva_2",2000,-1000,"EUR","2026-09-23T11:00:00Z"),
        ]
        snap=compute_cash_snapshot(currency="EUR",since="2026-09-23T00:00:00Z",assessments=facts)
        self.assertEqual(snap.realised_contribution_minor,4000)

    def test_priority_refuses_missing_values(self):
        result=cash_priority(
            CashOpportunity("opp_x",None,500,3,60,0.8),
            max_days_to_cash=30,max_capital_minor=10000,
            contribution_scale_minor=50000,human_minutes_scale=600,weights=W,
        )
        self.assertIsNone(result.priority_score)
        self.assertEqual(result.state,"enrich_data")

    def test_fast_low_capital_high_contribution_ranks_high(self):
        result=cash_priority(
            CashOpportunity("opp_x",40000,1000,2,60,0.9),
            max_days_to_cash=30,max_capital_minor=10000,
            contribution_scale_minor=50000,human_minutes_scale=600,weights=W,
        )
        self.assertGreater(result.priority_score,70)

    def test_currency_mismatch_rejected(self):
        with self.assertRaises(CashValidationError):
            compute_cash_snapshot(
                currency="EUR",since="2026-09-23T00:00:00Z",
                assessments=[CashFact("c","e",100,100,"USD","2026-09-23T10:00:00Z")],
            )


if __name__=="__main__":
    unittest.main(verbosity=2)
