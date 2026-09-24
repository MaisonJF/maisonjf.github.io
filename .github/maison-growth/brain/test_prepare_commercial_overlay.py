#!/usr/bin/env python3
from __future__ import annotations

import unittest

from prepare_commercial_overlay import build_overlay


class PrepareCommercialOverlayTests(unittest.TestCase):
    def test_builds_valid_overlay_from_filled_templates(self):
        stock={
            "schema_version":"commercial_stocktake_template_v1",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_stocktake",
                "operational":{
                    "inventory_quantity":4,
                    "reserved_quantity":1,
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                },
                "evidence_refs":["manual:stocktake:2026-09-24"],
            }],
        }
        service={
            "schema_version":"commercial_service_capacity_template_v1",
            "assets":[{
                "asset_ref":"catalog:service:tarot",
                "source":"manual_capacity_review",
                "operational":{
                    "capacity_units_per_period":6,
                    "capacity_period":"week",
                    "human_effort_minutes":75,
                    "variable_cost_minor":300,
                    "delivery_lead_days":2,
                },
                "evidence_refs":[],
            }],
        }
        payload=build_overlay(
            templates=(stock,service),
            observed_at="2026-09-24T10:00:00+01:00",
            evidence_refs=("manual:capacity-review:2026-09-24",),
        )
        self.assertEqual(payload["schema_version"],"commercial_asset_overlay_v1")
        self.assertEqual(len(payload["assets"]),2)
        by_ref={row["asset_ref"]:row for row in payload["assets"]}
        self.assertEqual(by_ref["catalog:product:nevoa"]["operational"]["inventory_quantity"],4)
        self.assertIn(
            "manual:capacity-review:2026-09-24",
            by_ref["catalog:service:tarot"]["evidence_refs"],
        )

    def test_builds_overlay_from_operations_facts_template_without_stock_snapshot(self):
        operations={
            "schema_version":"commercial_operations_facts_template_v1",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_operations_review",
                "operational":{
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                    "inventory_quantity":None,
                    "reserved_quantity":None,
                },
                "evidence_refs":["manual:operations:2026-09-24"],
            }],
        }
        payload=build_overlay(
            templates=(operations,),
            observed_at="2026-09-24T10:15:00+01:00",
        )
        row=payload["assets"][0]
        self.assertEqual(row["asset_ref"],"catalog:product:nevoa")
        self.assertNotIn("inventory_quantity",row["operational"])
        self.assertNotIn("reserved_quantity",row["operational"])
        self.assertEqual(row["operational"]["batch_capacity_units"],30)

    def test_skips_empty_rows_but_requires_at_least_one_filled_asset(self):
        empty={
            "schema_version":"commercial_stocktake_template_v1",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{"inventory_quantity":None},
                "evidence_refs":[],
            }],
        }
        with self.assertRaisesRegex(ValueError,"no_filled_operational_values"):
            build_overlay(
                templates=(empty,),
                observed_at="2026-09-24T10:00:00+01:00",
                evidence_refs=("manual:test",),
            )

    def test_filled_rows_require_evidence(self):
        filled={
            "schema_version":"commercial_stocktake_template_v1",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{"inventory_quantity":4},
                "evidence_refs":[],
            }],
        }
        with self.assertRaisesRegex(ValueError,"evidence_ref_required"):
            build_overlay(
                templates=(filled,),
                observed_at="2026-09-24T10:00:00+01:00",
            )

    def test_duplicate_asset_across_templates_is_rejected(self):
        row={
            "asset_ref":"catalog:product:nevoa",
            "operational":{"inventory_quantity":4},
            "evidence_refs":["manual:test"],
        }
        a={"schema_version":"commercial_stocktake_template_v1","assets":[row]}
        b={"schema_version":"commercial_stocktake_template_v1","assets":[row]}
        with self.assertRaisesRegex(ValueError,"duplicate_filled_asset"):
            build_overlay(
                templates=(a,b),
                observed_at="2026-09-24T10:00:00+01:00",
            )


if __name__=="__main__":
    unittest.main(verbosity=2)
