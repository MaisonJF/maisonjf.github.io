#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from pathlib import Path

from build_commercial_bundles import build_payload


ROOT=Path(__file__).resolve().parent


class CommercialBundleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=json.loads((ROOT/"commercial-bundles.source.json").read_text(encoding="utf-8"))
        cls.assets=json.loads((ROOT/"commercial-assets.generated.json").read_text(encoding="utf-8"))
        cls.payload=build_payload(cls.source,cls.assets)
        cls.editorial=json.loads((ROOT/"editorial-queue.json").read_text(encoding="utf-8"))

    def test_generated_bundle_file_is_current(self):
        generated=json.loads((ROOT/"commercial-bundles.generated.json").read_text(encoding="utf-8"))
        self.assertEqual(generated,self.payload)

    def test_bundle_drafts_are_internal_and_non_executing(self):
        self.assertEqual(self.payload["summary"]["bundle_count"],4)
        self.assertEqual(self.payload["summary"]["ready_for_publication"],0)
        for bundle in self.payload["bundles"]:
            self.assertEqual(bundle["status"],"draft_hypothesis")
            self.assertIsNone(bundle["bundle_price_minor"])
            self.assertFalse(bundle["authority"]["public_write_authorized"])
            self.assertFalse(bundle["authority"]["automatic_checkout_authorized"])
            self.assertTrue(bundle["authority"]["human_approval_required"])

    def test_catalogue_subtotals_are_derived_not_offer_prices(self):
        subtotals={x["bundle_id"]:x["catalogue_subtotal_minor"] for x in self.payload["bundles"]}
        self.assertEqual(subtotals,{
            "bundle_pausa_casa":1500,
            "bundle_pausa_corpo":1700,
            "bundle_volta_para_casa":2000,
            "bundle_casa_corpo_completo":3200,
        })
        for bundle in self.payload["bundles"]:
            self.assertIn("catalogue_subtotal_not_offer_price",bundle["reason_codes"])

    def test_replenishment_and_margin_remain_blocked_but_stock_snapshot_does_not(self):
        self.assertEqual(self.payload["summary"]["requires_stock_check"],0)
        self.assertEqual(self.payload["summary"]["requires_replenishment_check"],4)
        self.assertEqual(self.payload["summary"]["requires_margin_check"],4)
        self.assertTrue(self.payload["contract"]["current_stock_is_optional_snapshot"])
        self.assertTrue(self.payload["contract"]["replenishment_capacity_must_be_verified_before_offer"])
        for bundle in self.payload["bundles"]:
            readiness=bundle["operational_readiness"]
            self.assertFalse(readiness["current_stock_snapshot_required"])
            self.assertFalse(readiness["stock_snapshot_is_readiness_gate"])
            self.assertFalse(readiness["replenishment_capacity_known"])
            self.assertFalse(readiness["unit_cost_known"])
            self.assertTrue(readiness["replenishment_check_required"])
            self.assertTrue(readiness["margin_check_required"])
            self.assertNotIn("inventory_unknown",bundle["reason_codes"])
            self.assertIn("replenishment_capacity_unknown",bundle["reason_codes"])

    def test_bundle_assets_are_existing_public_active_physical_products(self):
        by_ref={x["asset_ref"]:x for x in self.assets["assets"]}
        for bundle in self.payload["bundles"]:
            for ref in bundle["asset_refs"]:
                asset=by_ref[ref]
                self.assertTrue(asset["public"])
                self.assertEqual(asset["lifecycle_status"],"active")
                self.assertEqual(asset["asset_type"],"physical_product")

    def test_bundle_ocean_territories_exist_in_internal_editorial_queue(self):
        known={
            str(item.get("territory"))
            for item in self.editorial.get("items",[])
            if item.get("territory")
        }
        for bundle in self.payload["bundles"]:
            self.assertTrue(set(bundle["ocean_territories"]).issubset(known))


if __name__=="__main__":
    unittest.main(verbosity=2)
