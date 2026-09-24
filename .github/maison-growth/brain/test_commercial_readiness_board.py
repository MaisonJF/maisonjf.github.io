#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from commercial_readiness_board import build_board


class CommercialReadinessBoardTests(unittest.TestCase):
    def test_without_private_facts_board_is_truthful_and_non_executing(self):
        board=build_board()
        self.assertEqual(board["kind"],"maison_commercial_readiness_board")
        self.assertFalse(board["overlay_loaded"])
        self.assertEqual(board["summary"]["assets"],12)
        self.assertEqual(board["summary"]["manual_validation_ready"],0)
        self.assertEqual(board["summary"]["unit_economics_known"],0)
        self.assertFalse(any(board["authority"].values()))
        self.assertFalse(board["contract"]["writes_performed"])
        self.assertTrue(board["contract"]["unknown_facts_remain_unknown"])
        self.assertTrue(board["contract"]["catalogue_availability_is_not_inventory"])

    def test_physical_product_points_to_cost_then_replenishment_not_stock_count(self):
        board=build_board()
        row=next(x for x in board["rows"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertEqual(row["next_action"]["code"],"verify_unit_cost")
        self.assertIn("current_stock_snapshot_unknown",row["readiness"]["signals"])
        self.assertFalse(row["fulfilment"]["stock_snapshot_is_readiness_gate"])
        self.assertFalse(row["readiness"]["unit_economics_known"])
        self.assertFalse(row["readiness"]["manual_validation_ready"])
        self.assertFalse(any(row["authority"].values()))

    def test_multi_format_service_requires_human_price_selection(self):
        board=build_board()
        row=next(x for x in board["rows"] if x["asset_ref"]=="catalog:service:companhia")
        self.assertTrue(row["pricing"]["price_selection_required"])
        self.assertEqual(row["next_action"]["code"],"select_concrete_price")
        self.assertIsNone(row["pricing"]["selected_price_minor"])

    def test_private_overlay_can_change_readiness_without_changing_authority(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T04:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{
                    "inventory_quantity":10,
                    "reserved_quantity":1,
                    "unit_material_cost_minor":150,
                    "packaging_cost_minor":50,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":20,
                },
                "evidence_refs":["manual:stocktake:test"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            board=build_board(overlay_path=path)
        row=next(x for x in board["rows"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertTrue(board["overlay_loaded"])
        self.assertTrue(row["readiness"]["unit_economics_known"])
        self.assertTrue(row["readiness"]["manual_validation_ready"])
        self.assertEqual(row["next_action"]["code"],"human_validation_review")
        self.assertFalse(any(row["authority"].values()))

    def test_unknown_stock_can_still_be_ready_when_replenishment_is_known(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T04:01:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:nevoa",
                "operational":{
                    "unit_material_cost_minor":150,
                    "packaging_cost_minor":50,
                    "production_minutes_per_unit":5,
                    "batch_capacity_units":30,
                },
                "evidence_refs":["manual:operations:test"],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"facts.private.json"
            path.write_text(json.dumps(overlay),encoding="utf-8")
            board=build_board(overlay_path=path)
        row=next(x for x in board["rows"] if x["asset_ref"]=="catalog:product:nevoa")
        self.assertIsNone(row["fulfilment"]["available_units_at_observation"])
        self.assertTrue(row["fulfilment"]["replenishment_capacity_known"])
        self.assertTrue(row["readiness"]["manual_validation_ready"])
        self.assertEqual(row["next_action"]["code"],"human_validation_review")

    def test_selected_catalogue_service_option_is_visible_but_still_human_gated(self):
        board=build_board(selected_service_prices={"catalog:service:companhia":3500})
        row=next(x for x in board["rows"] if x["asset_ref"]=="catalog:service:companhia")
        self.assertEqual(row["pricing"]["selected_price_minor"],3500)
        self.assertFalse(row["pricing"]["price_selection_required"])
        self.assertEqual(row["next_action"]["code"],"verify_service_capacity")
        self.assertFalse(any(row["authority"].values()))


if __name__=="__main__":
    unittest.main(verbosity=2)
