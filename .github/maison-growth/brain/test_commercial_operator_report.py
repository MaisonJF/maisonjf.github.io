#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from commercial_operator_report import build_report


class CommercialOperatorReportTests(unittest.TestCase):
    def test_report_without_private_overlay_is_safe_and_fully_blocked(self):
        report=build_report()
        self.assertFalse(report["overlay_loaded"])
        self.assertTrue(report["attention_score_is_not_profit_score"])
        self.assertFalse(any(report["authority"].values()))
        self.assertEqual(report["summary"]["ranked_assets"],12)
        self.assertEqual(report["summary"]["operationally_complete_assets"],0)
        self.assertEqual(report["summary"]["unit_economics_known_assets"],0)
        self.assertEqual(report["summary"]["manual_validation_ready_assets"],0)
        self.assertEqual(report["summary"]["bundle_manual_validation_ready"],0)

    def test_operator_can_select_catalogue_service_variant_without_changing_catalogue(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T11:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:service:companhia",
                "source":"manual_capacity_review",
                "operational":{
                    "capacity_units_per_period":4,
                    "capacity_period":"week",
                    "human_effort_minutes":60,
                    "variable_cost_minor":200,
                    "delivery_lead_days":1,
                },
                "evidence_refs":["manual:capacity-review:2026-09-24"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"overlay.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            report=build_report(
                overlay_path=path,
                selected_service_prices={"catalog:service:companhia":3500},
            )

        row=next(x for x in report["attention"] if x["asset_ref"]=="catalog:service:companhia")
        self.assertTrue(row["operational_facts_complete"])
        self.assertTrue(row["unit_economics_known"])
        self.assertTrue(row["manual_validation_ready"])
        self.assertFalse(any(report["authority"].values()))

    def test_private_overlay_changes_readiness_without_granting_authority(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T11:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "source":"manual_stocktake",
                "operational":{
                    "inventory_quantity":6,
                    "reserved_quantity":1,
                    "unit_material_cost_minor":180,
                    "packaging_cost_minor":70,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                },
                "evidence_refs":["manual:ops:2026-09-24"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"overlay.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            report=build_report(overlay_path=path)

        self.assertTrue(report["overlay_loaded"])
        row=next(x for x in report["attention"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertTrue(row["operational_facts_complete"])
        self.assertTrue(row["unit_economics_known"])
        self.assertTrue(row["manual_validation_ready"])
        self.assertFalse(any(report["authority"].values()))


if __name__=="__main__":
    unittest.main(verbosity=2)
