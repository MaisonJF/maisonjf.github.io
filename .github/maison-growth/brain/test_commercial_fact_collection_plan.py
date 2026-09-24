#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from commercial_fact_collection_plan import build_plan


class CommercialFactCollectionPlanTests(unittest.TestCase):
    def test_default_plan_contains_no_private_values_or_authority(self):
        plan=build_plan()
        self.assertEqual(plan["kind"],"maison_commercial_fact_collection_plan")
        self.assertFalse(plan["contract"]["contains_private_values"])
        self.assertFalse(plan["contract"]["execution_authority"])
        self.assertFalse(plan["contract"]["writes_performed"])
        self.assertGreater(plan["summary"]["tasks"],0)
        for task in plan["tasks"]:
            for field in task["fields"]:
                self.assertIsNone(field["value"])
                self.assertIsNone(field["evidence_ref"])

    def test_top_physical_asset_does_not_require_volatile_stock_snapshot(self):
        plan=build_plan()
        task=next(x for x in plan["tasks"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertEqual(task["next_action"],"verify_unit_cost")
        self.assertEqual([x["field"] for x in task["fields"]],["unit_material_cost_minor","packaging_cost_minor"])
        self.assertTrue(task["rules"]["current_stock_snapshot_is_optional_and_volatile"])

    def test_service_without_concrete_price_asks_human_to_select_price(self):
        plan=build_plan()
        task=next(x for x in plan["tasks"] if x["asset_ref"]=="catalog:service:companhia")
        self.assertEqual(task["next_action"],"select_concrete_price")
        self.assertEqual([x["field"] for x in task["fields"]],["selected_price_minor"])

    def test_overlay_advances_one_asset_to_replenishment_after_cost(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T07:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{
                    "unit_material_cost_minor":150,
                    "packaging_cost_minor":50,
                },
                "evidence_refs":["manual:cost-sheet:test"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            plan=build_plan(overlay_path=path)
        task=next(x for x in plan["tasks"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertEqual(task["next_action"],"verify_replenishment_capacity")
        self.assertEqual([x["field"] for x in task["fields"]],["production_minutes_per_unit","batch_capacity_units"])

    def test_complete_asset_disappears_from_collection_tasks(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T07:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{
                    "inventory_quantity":8,
                    "reserved_quantity":1,
                    "unit_material_cost_minor":150,
                    "packaging_cost_minor":50,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":20,
                },
                "evidence_refs":["manual:operations:test"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            plan=build_plan(overlay_path=path)
        self.assertNotIn("catalog:product:nevoa",{x["asset_ref"] for x in plan["tasks"]})
        self.assertEqual(plan["summary"]["assets_already_past_collection_gate"],1)


    def test_delivery_window_action_has_a_collectable_field(self):
        from commercial_fact_collection_plan import ACTION_FIELDS
        self.assertEqual(
            ACTION_FIELDS["verify_delivery_window"][0][0],
            "delivery_lead_days",
        )

if __name__=="__main__":
    unittest.main(verbosity=2)
