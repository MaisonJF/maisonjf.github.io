#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from pathlib import Path

from commercial_assets import CommercialAssetContext
from commercial_economics import CommercialEconomicsError, evaluate_asset, evaluate_bundle


ROOT=Path(__file__).resolve().parent


class CommercialEconomicsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry=json.loads((ROOT/"commercial-assets.generated.json").read_text(encoding="utf-8"))
        cls.bundles=json.loads((ROOT/"commercial-bundles.generated.json").read_text(encoding="utf-8"))

    def test_unknown_operational_facts_block_asset_economics(self):
        ctx=CommercialAssetContext(self.registry)
        result=evaluate_asset(ctx,"catalog:product:nevoa")
        self.assertFalse(result["operational_facts_complete"])
        self.assertFalse(result["unit_economics_known"])
        self.assertFalse(result["manual_validation_ready"])
        self.assertIn("stock_count_incomplete",result["blockers"])
        self.assertIn("unit_cost_incomplete",result["blockers"])
        self.assertFalse(any(result["authority"].values()))

    def test_physical_asset_economics_use_observed_cost_and_stock_only(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_stocktake",
                "operational":{
                    "inventory_quantity":10,
                    "reserved_quantity":2,
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                },
                "evidence_refs":["manual:stocktake:2026-09-24","manual:cost-sheet:2026-09-24"],
            }],
        }
        ctx=CommercialAssetContext(self.registry,overlay=overlay)
        result=evaluate_asset(ctx,"catalog:product:nevoa")
        self.assertEqual(result["available_units"],8)
        self.assertEqual(result["unit_cost_minor"],250)
        self.assertEqual(result["unit_contribution_minor"],450)
        self.assertEqual(result["contribution_margin_bps"],6429)
        self.assertTrue(result["manual_validation_ready"])
        self.assertFalse(any(result["authority"].values()))

    def test_service_requires_capacity_effort_cost_and_concrete_price(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:service:tarot",
                "source":"manual_capacity_review",
                "operational":{
                    "capacity_units_per_period":8,
                    "capacity_period":"week",
                    "human_effort_minutes":75,
                    "variable_cost_minor":300,
                    "delivery_lead_days":2,
                },
                "evidence_refs":["manual:capacity-review:2026-09-24"],
            }],
        }
        ctx=CommercialAssetContext(self.registry,overlay=overlay)
        result=evaluate_asset(ctx,"catalog:service:tarot")
        self.assertTrue(result["operational_facts_complete"])
        self.assertTrue(result["unit_economics_known"])
        self.assertEqual(result["unit_contribution_minor"],3200)
        self.assertEqual(result["contribution_margin_bps"],9143)
        self.assertTrue(result["manual_validation_ready"])

    def test_bundle_evaluation_never_selects_price_or_discount(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:00:00+01:00",
            "assets":[
                {
                    "asset_ref":"catalog:product:nevoa",
                    "operational":{
                        "inventory_quantity":10,
                        "reserved_quantity":1,
                        "unit_material_cost_minor":180,
                        "packaging_cost_minor":70,
                    },
                    "evidence_refs":["manual:ops:2026-09-24"],
                },
                {
                    "asset_ref":"catalog:product:vela-pequena",
                    "operational":{
                        "inventory_quantity":6,
                        "reserved_quantity":1,
                        "unit_material_cost_minor":220,
                        "packaging_cost_minor":90,
                    },
                    "evidence_refs":["manual:ops:2026-09-24"],
                },
            ],
        }
        ctx=CommercialAssetContext(self.registry,overlay=overlay)
        bundle=next(x for x in self.bundles["bundles"] if x["bundle_id"]=="bundle_pausa_casa")

        preview=evaluate_bundle(bundle=bundle,context=ctx)
        self.assertIsNone(preview["proposed_price_minor"])
        self.assertIsNone(preview["unit_contribution_minor"])
        self.assertIn("human_price_not_supplied",preview["blockers"])
        self.assertFalse(preview["authority"]["bundle_price_selected_by_system"])

        evaluated=evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=1400)
        self.assertEqual(evaluated["available_bundle_units"],5)
        self.assertEqual(evaluated["combined_unit_cost_minor"],560)
        self.assertEqual(evaluated["difference_from_catalogue_subtotal_minor"],-100)
        self.assertEqual(evaluated["unit_contribution_minor"],840)
        self.assertEqual(evaluated["contribution_margin_bps"],6000)
        self.assertTrue(evaluated["manual_validation_ready"])
        self.assertFalse(evaluated["authority"]["discount_authorized"])

    def test_bundle_rejects_invalid_human_price(self):
        ctx=CommercialAssetContext(self.registry)
        bundle=self.bundles["bundles"][0]
        with self.assertRaisesRegex(CommercialEconomicsError,"positive_int"):
            evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=0)


if __name__=="__main__":
    unittest.main(verbosity=2)
