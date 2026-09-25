#!/usr/bin/env python3
from __future__ import annotations

import unittest

from commercial_ocean_matrix import build_ocean_matrix
from ocean_universal_coverage import build_contract as build_universal_coverage


class CommercialOceanMatrixTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload=build_ocean_matrix()

    def test_matrix_tracks_the_canonical_ocean_set_without_forcing_digital_eligibility(self):
        rows=self.payload["oceans"]
        universal=build_universal_coverage()
        expected_ids=set(universal["ocean_ids"])
        actual_ids={row["territory"] for row in rows}
        self.assertEqual(actual_ids,expected_ids)
        self.assertEqual(self.payload["summary"]["oceans"],len(expected_ids))
        self.assertEqual(
            self.payload["summary"]["pdi_feed_oceans"],
            sum(row["digital_feeds"]["pdi_eligible"] for row in rows),
        )
        self.assertEqual(
            self.payload["summary"]["oracle_feed_oceans"],
            sum(row["digital_feeds"]["oracle_eligible"] for row in rows),
        )

    def test_commercial_matches_are_context_only_and_non_executing(self):
        contract=self.payload["contract"]
        self.assertTrue(contract["ocean_metadata_is_context_not_external_evidence"])
        self.assertTrue(contract["attention_score_is_not_profit_score"])
        self.assertTrue(contract["feed_eligibility_is_not_commercial_demand"])
        self.assertTrue(contract["structural_gaps_are_not_product_launch_recommendations"])
        self.assertFalse(contract["execution_authority"])
        for row in self.payload["oceans"]:
            for match in row["commercial_matches"]:
                self.assertTrue(match["attention_score_is_not_profit_score"])
                self.assertFalse(match["execution_authority"])

    def test_structural_gap_vocabulary_is_bounded(self):
        allowed={
            "no_physical_match",
            "no_service_match",
            "no_fixed_low_ticket_match",
        }
        for row in self.payload["oceans"]:
            self.assertTrue(set(row["structural_gaps"]) <= allowed)

    def test_presence_ocean_recognises_existing_presence_service(self):
        row=next(
            x for x in self.payload["oceans"]
            if x["territory"]=="presenca-que-ampara-sem-tentar-resolver"
        )
        refs={x["asset_ref"] for x in row["commercial_matches"]}
        self.assertIn("catalog:service:companhia",refs)
        self.assertTrue(row["digital_feeds"]["oracle_eligible"])
        self.assertTrue(row["digital_feeds"]["pdi_eligible"])


if __name__=="__main__":
    unittest.main(verbosity=2)
