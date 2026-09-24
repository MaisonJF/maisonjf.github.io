#!/usr/bin/env python3
from __future__ import annotations

import unittest

from commercial_ocean_matrix import build_ocean_matrix


class CommercialOceanMatrixTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload=build_ocean_matrix()

    def test_all_current_oceans_are_present_and_feed_both_digital_products(self):
        rows=self.payload["oceans"]
        self.assertEqual(self.payload["summary"]["oceans"],18)
        self.assertEqual(len(rows),18)
        self.assertTrue(all(row["digital_feeds"]["pdi_eligible"] for row in rows))
        self.assertTrue(all(row["digital_feeds"]["oracle_eligible"] for row in rows))
        self.assertEqual(self.payload["summary"]["pdi_feed_oceans"],18)
        self.assertEqual(self.payload["summary"]["oracle_feed_oceans"],18)

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
