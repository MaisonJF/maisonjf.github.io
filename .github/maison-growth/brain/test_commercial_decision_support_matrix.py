#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from commercial_decision_support_matrix import build_matrix


class CommercialDecisionSupportMatrixTests(unittest.TestCase):
    def test_default_matrix_is_safe_and_does_not_rank_profit(self):
        matrix=build_matrix()
        self.assertEqual(matrix["kind"],"maison_commercial_decision_support_matrix")
        self.assertEqual(matrix["mode"],"human_decision_support_only")
        self.assertFalse(matrix["private_values_included"])
        self.assertTrue(matrix["contract"]["preserves_attention_order"])
        self.assertTrue(matrix["contract"]["no_combined_score"])
        self.assertTrue(matrix["contract"]["no_profit_ranking"])
        self.assertTrue(matrix["contract"]["no_recommended_winner"])
        self.assertFalse(any(matrix["authority"].values()))
        self.assertGreater(matrix["summary"]["assets"],0)
        self.assertEqual(matrix["summary"]["private_value_rows"],0)
        ranks=[row["attention_rank"] for row in matrix["rows"]]
        self.assertEqual(ranks,sorted(ranks))
        for row in matrix["rows"]:
            self.assertNotIn("private_economics",row)
            self.assertFalse(row["attention"]["is_profit_score"])

    def test_evidence_backed_overlay_changes_dimensions_without_creating_winner(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T10:30:00+01:00",
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
            path=Path(tmp)/"ops.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            matrix=build_matrix(overlay_path=path)
        row=next(x for x in matrix["rows"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertTrue(row["readiness"]["unit_economics_known"])
        self.assertTrue(row["readiness"]["manual_validation_ready"])
        self.assertEqual(row["economic_dimensions"]["unit_contribution"],"known")
        self.assertEqual(row["economic_dimensions"]["contribution_margin"],"known")
        self.assertEqual(row["economic_dimensions"]["production_efficiency"],"known")
        self.assertTrue(row["economic_dimensions"]["evidence_backed"])
        self.assertNotIn("private_economics",row)
        self.assertTrue(matrix["contract"]["no_recommended_winner"])

    def test_full_private_mode_is_explicit_and_keeps_authority_false(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T10:30:00+01:00",
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
            path=Path(tmp)/"ops.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            matrix=build_matrix(overlay_path=path,include_private_values=True)
        row=next(x for x in matrix["rows"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertTrue(matrix["private_values_included"])
        self.assertEqual(row["private_economics"]["unit_contribution_minor"],450)
        self.assertEqual(row["private_economics"]["contribution_per_production_minute_minor"],90.0)
        self.assertEqual(row["private_economics"]["evidence_refs"],["manual:ops:test"])
        self.assertFalse(any(matrix["authority"].values()))


if __name__=="__main__":
    unittest.main(verbosity=2)
