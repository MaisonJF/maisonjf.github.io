#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from commercial_operations_fact_summary import build_summary


class OperationsFactSummaryTests(unittest.TestCase):
    def test_default_summary_exposes_no_private_values(self):
        result=build_summary()
        self.assertFalse(result["private_values_exposed"])
        self.assertFalse(result["contract"]["execution_authority"])
        self.assertEqual(result["summary"]["active_public_physical_assets"],5)
        self.assertEqual(result["summary"]["structurally_complete"],0)
        for row in result["assets"]:
            self.assertNotIn("unit_cost_minor",row)
            self.assertNotIn("available_units",row)

    def test_overlay_reports_presence_only_and_stock_is_not_gate(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T08:30:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_operations_review",
                "operational":{
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                },
                "evidence_refs":["manual:ops:test"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            result=build_summary(overlay_path=path)
        row=next(x for x in result["assets"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertEqual(row["structural_missing_fields"],[])
        self.assertEqual(row["stock_snapshot_known_fields"],[])
        self.assertFalse(row["stock_snapshot_is_readiness_gate"])
        self.assertTrue(row["replenishment_capacity_known"])
        self.assertTrue(row["unit_economics_known"])
        self.assertTrue(row["manual_validation_ready"])
        self.assertEqual(row["evidence_ref_count"],1)


if __name__=="__main__":
    unittest.main(verbosity=2)
