#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path

from digital_experience_coverage import load_coverage


ROOT=Path(__file__).resolve().parent


class DigitalExperienceCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload=load_coverage()

    def test_canonical_digital_products_are_available_to_brain(self):
        products=self.payload["products"]
        self.assertEqual(products["oracle"]["asset_ref"],"catalog:digital:oracle")
        self.assertEqual(products["oracle"]["price_minor"],200)
        self.assertEqual(products["oracle"]["territory_source_count"],100)
        self.assertEqual(products["pdi"]["asset_ref"],"catalog:digital:pdi")
        self.assertEqual(products["pdi"]["price_minor"],500)
        self.assertEqual(products["pdi"]["source_theme_count"],261)

    def test_all_current_oceans_feed_both_products(self):
        summary=self.payload["summary"]
        self.assertEqual(summary["oceans"],18)
        self.assertEqual(summary["pdi_oceans"],18)
        self.assertEqual(summary["oracle_oceans"],18)
        self.assertEqual(summary["pdi_stage_slots"],666)
        self.assertEqual(summary["oracle_role_slots"],126)
        self.assertEqual(summary["oceans_with_feed_gaps"],0)

    def test_feed_contract_never_stores_or_auto_activates_paid_bodies(self):
        contract=self.payload["contract"]
        self.assertFalse(contract["paid_bodies_stored"])
        self.assertFalse(contract["automatic_publication"])
        self.assertFalse(contract["automatic_activation"])
        self.assertTrue(contract["human_editorial_approval_required"])
        for row in self.payload["oceans"]:
            self.assertTrue(row["pdi"]["approval_required"])
            self.assertTrue(row["oracle"]["approval_required"])
            self.assertFalse(row["pdi"]["automatic_activation"])
            self.assertFalse(row["oracle"]["automatic_activation"])
            self.assertFalse(row["pdi"]["paid_body_stored"])
            self.assertFalse(row["oracle"]["paid_body_stored"])
            self.assertEqual(row["gaps"],[])


if __name__=="__main__":
    unittest.main(verbosity=2)
