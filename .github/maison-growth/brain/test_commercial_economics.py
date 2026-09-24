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
        self.assertIn("replenishment_capacity_incomplete",result["blockers"])
        self.assertIn("unit_cost_incomplete",result["blockers"])
        self.assertIn("current_stock_snapshot_unknown",result["signals"])
        self.assertFalse(result["stock_snapshot_is_readiness_gate"])
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
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
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

    def test_zero_current_stock_does_not_block_when_replenishment_is_known(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:01:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_operations",
                "operational":{
                    "inventory_quantity":0,
                    "reserved_quantity":0,
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                },
                "evidence_refs":["manual:ops:2026-09-24"],
            }],
        }
        result=evaluate_asset(CommercialAssetContext(self.registry,overlay=overlay),"catalog:product:nevoa")
        self.assertEqual(result["available_units"],0)
        self.assertIn("no_units_available_at_observation",result["signals"])
        self.assertNotIn("no_available_units",result["blockers"])
        self.assertTrue(result["replenishment_capacity_known"])
        self.assertTrue(result["manual_validation_ready"])

    def test_unknown_stock_does_not_block_when_cost_and_replenishment_are_known(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:02:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_operations",
                "operational":{
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                },
                "evidence_refs":["manual:ops:2026-09-24"],
            }],
        }
        result=evaluate_asset(CommercialAssetContext(self.registry,overlay=overlay),"catalog:product:nevoa")
        self.assertIsNone(result["available_units"])
        self.assertIn("current_stock_snapshot_unknown",result["signals"])
        self.assertTrue(result["manual_validation_ready"])

    def test_digital_product_keeps_delivery_costs_unknown_until_observed(self):
        ctx=CommercialAssetContext(self.registry)
        result=evaluate_asset(ctx,"catalog:digital:oracle")
        self.assertEqual(result["price_minor"],200)
        self.assertFalse(result["operational_facts_complete"])
        self.assertFalse(result["unit_economics_known"])
        self.assertFalse(result["manual_validation_ready"])
        self.assertIn("delivery_effort_incomplete",result["blockers"])
        self.assertIn("variable_cost_unknown",result["blockers"])

        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T08:30:00+01:00",
            "assets":[{
                "asset_ref":"catalog:digital:oracle",
                "source":"manual_digital_delivery_review",
                "operational":{
                    "human_effort_minutes":0,
                    "variable_cost_minor":20,
                    "delivery_lead_days":0,
                },
                "evidence_refs":["manual:digital-delivery:oracle:2026-09-24"],
            }],
        }
        result=evaluate_asset(
            CommercialAssetContext(self.registry,overlay=overlay),
            "catalog:digital:oracle",
        )
        self.assertTrue(result["operational_facts_complete"])
        self.assertTrue(result["unit_economics_known"])
        self.assertEqual(result["unit_contribution_minor"],180)
        self.assertEqual(result["contribution_margin_bps"],9000)
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

    def test_multi_format_service_requires_human_selection_from_catalogue_options(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T00:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:service:companhia",
                "source":"manual_capacity_review",
                "operational":{
                    "capacity_units_per_period":5,
                    "capacity_period":"week",
                    "human_effort_minutes":60,
                    "variable_cost_minor":200,
                    "delivery_lead_days":1,
                },
                "evidence_refs":["manual:capacity-review:2026-09-24"],
            }],
        }
        ctx=CommercialAssetContext(self.registry,overlay=overlay)

        unresolved=evaluate_asset(ctx,"catalog:service:companhia")
        self.assertTrue(unresolved["price_selection_required"])
        self.assertIn("concrete_price_unknown",unresolved["blockers"])

        selected=evaluate_asset(
            ctx,
            "catalog:service:companhia",
            selected_price_minor=3500,
        )
        self.assertFalse(selected["price_selection_required"])
        self.assertEqual(selected["price_resolution"],"human_selected_catalogue_option")
        self.assertEqual(selected["unit_contribution_minor"],3300)
        self.assertTrue(selected["manual_validation_ready"])

        with self.assertRaisesRegex(
            CommercialEconomicsError,
            "not_in_catalogue_service_options",
        ):
            evaluate_asset(
                ctx,
                "catalog:service:companhia",
                selected_price_minor=4000,
            )

    def test_starting_from_service_rejects_human_price_below_catalogue_minimum(self):
        ctx=CommercialAssetContext(self.registry)
        with self.assertRaisesRegex(CommercialEconomicsError,"below_catalogue_minimum"):
            evaluate_asset(
                ctx,
                "catalog:service:mentoria",
                selected_price_minor=12000,
            )

    def test_bundle_evaluation_never_selects_price_automatically(self):
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
                        "production_minutes_per_unit":5,
                        "batch_capacity_units":30,
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
                        "production_minutes_per_unit":8,
                        "batch_capacity_units":12,
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

        evaluated=evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=1500)
        self.assertEqual(evaluated["available_bundle_units"],5)
        self.assertTrue(evaluated["replenishment_capacity_known"])
        self.assertEqual(evaluated["replenishment_batch_units"],12)
        self.assertEqual(evaluated["production_minutes_per_bundle"],13)
        self.assertEqual(evaluated["combined_unit_cost_minor"],560)
        self.assertEqual(evaluated["bundle_price_floor_minor"],1500)
        self.assertEqual(evaluated["difference_from_catalogue_subtotal_minor"],0)
        self.assertEqual(evaluated["unit_contribution_minor"],940)
        self.assertEqual(evaluated["contribution_margin_bps"],6267)
        self.assertTrue(evaluated["manual_validation_ready"])

    def test_bundle_unknown_finished_stock_does_not_block_known_replenishment(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T08:00:00+01:00",
            "assets":[
                {
                    "asset_ref":"catalog:product:nevoa",
                    "operational":{
                        "unit_material_cost_minor":180,
                        "packaging_cost_minor":70,
                        "production_minutes_per_unit":5,
                        "batch_capacity_units":30,
                    },
                    "evidence_refs":["manual:ops:test"],
                },
                {
                    "asset_ref":"catalog:product:vela-pequena",
                    "operational":{
                        "unit_material_cost_minor":220,
                        "packaging_cost_minor":90,
                        "production_minutes_per_unit":8,
                        "batch_capacity_units":12,
                    },
                    "evidence_refs":["manual:ops:test"],
                },
            ],
        }
        ctx=CommercialAssetContext(self.registry,overlay=overlay)
        bundle=next(x for x in self.bundles["bundles"] if x["bundle_id"]=="bundle_pausa_casa")
        result=evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=1500)
        self.assertIsNone(result["available_bundle_units"])
        self.assertIn("bundle_current_stock_snapshot_unknown",result["signals"])
        self.assertTrue(result["replenishment_capacity_known"])
        self.assertFalse(result["stock_snapshot_is_readiness_gate"])
        self.assertTrue(result["manual_validation_ready"])
        self.assertFalse(any(result["authority"].values()))

    def test_bundle_rejects_human_price_below_catalogue_subtotal(self):
        ctx=CommercialAssetContext(self.registry)
        bundle=next(x for x in self.bundles["bundles"] if x["bundle_id"]=="bundle_pausa_casa")
        with self.assertRaisesRegex(CommercialEconomicsError,"below_catalogue_subtotal"):
            evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=1499)

    def test_bundle_rejects_invalid_human_price(self):
        ctx=CommercialAssetContext(self.registry)
        bundle=self.bundles["bundles"][0]
        with self.assertRaisesRegex(CommercialEconomicsError,"positive_int"):
            evaluate_bundle(bundle=bundle,context=ctx,proposed_price_minor=0)


if __name__=="__main__":
    unittest.main(verbosity=2)
