#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from pathlib import Path

from commercial_decision_support_matrix import build_matrix
from commercial_readiness_board import build_board


ROOT=Path(__file__).resolve().parent
GROWTH=ROOT.parent


def _keys(value):
    if isinstance(value,dict):
        for key,child in value.items():
            yield str(key)
            yield from _keys(child)
    elif isinstance(value,list):
        for child in value:
            yield from _keys(child)


class CommercialGreenInvariantTests(unittest.TestCase):
    def test_operations_template_matches_active_public_physical_catalogue(self):
        registry=json.loads((ROOT/"commercial-assets.generated.json").read_text(encoding="utf-8"))
        operations=json.loads((ROOT/"commercial-operations-facts.template.json").read_text(encoding="utf-8"))
        expected={
            row["asset_ref"]
            for row in registry["assets"]
            if row.get("asset_type")=="physical_product"
            and row.get("public") is True
            and row.get("lifecycle_status")=="active"
        }
        actual={row["asset_ref"] for row in operations["assets"]}
        self.assertEqual(actual,expected)
        for row in operations["assets"]:
            op=row["operational"]
            for field in (
                "unit_material_cost_minor",
                "packaging_cost_minor",
                "production_minutes_per_unit",
                "batch_capacity_units",
            ):
                self.assertIn(field,op)
            self.assertTrue(all(value is None for value in op.values()))
            self.assertEqual(row["evidence_refs"],[])

    def test_legacy_stocktake_is_explicitly_non_structural(self):
        legacy=json.loads((ROOT/"commercial-stocktake.template.json").read_text(encoding="utf-8"))
        self.assertTrue(legacy["deprecated_for_structural_readiness"])
        self.assertEqual(legacy["superseded_by"],"commercial-operations-facts.template.json")

    def test_bundle_contract_contains_no_discount_mechanism(self):
        for name in ("commercial-bundles.source.json","commercial-bundles.generated.json"):
            payload=json.loads((ROOT/name).read_text(encoding="utf-8"))
            discount_keys=[key for key in _keys(payload) if "discount" in key.lower()]
            self.assertEqual(discount_keys,[],msg=f"{name} contains discount keys: {discount_keys}")

    def test_stock_snapshot_cannot_become_readiness_gate(self):
        board=build_board()
        self.assertTrue(board["contract"]["current_stock_is_volatile_snapshot_not_readiness_gate"])
        self.assertTrue(board["contract"]["replenishment_capacity_is_structural_fulfilment_fact"])
        self.assertFalse(any(board["authority"].values()))
        for row in board["rows"]:
            fulfilment=row.get("fulfilment")
            if fulfilment is not None:
                self.assertFalse(fulfilment["stock_snapshot_is_readiness_gate"])
            self.assertFalse(any(row["authority"].values()))

    def test_decision_support_never_creates_profit_winner_or_execution_authority(self):
        matrix=build_matrix()
        self.assertTrue(matrix["contract"]["no_combined_score"])
        self.assertTrue(matrix["contract"]["no_profit_ranking"])
        self.assertTrue(matrix["contract"]["no_recommended_winner"])
        self.assertFalse(matrix["private_values_included"])
        self.assertFalse(any(matrix["authority"].values()))
        for row in matrix["rows"]:
            self.assertFalse(row["attention"]["is_profit_score"])
            self.assertNotIn("private_economics",row)

    def test_validation_planner_does_not_restore_finished_stock_as_physical_gate(self):
        planner=(ROOT/"validation_planner.py").read_text(encoding="utf-8")
        self.assertNotIn("stock_or_material_availability",planner)
        self.assertIn("production_minutes_per_unit",planner)
        self.assertIn("batch_capacity_units",planner)

    def test_status_and_runbook_do_not_regress_to_old_stock_gate_language(self):
        status=(GROWTH/"BRAIN_RUNTIME_STATUS.md").read_text(encoding="utf-8")
        runbook=(ROOT/"COMMERCIAL_OPERATIONS_RUNBOOK.md").read_text(encoding="utf-8")
        for stale in (
            "STOCK + MARGIN CHECKS REQUIRED",
            "AWAITING MANUAL COUNTS/COSTS",
            "stock/cost/price or capacity/effort/quote/consent",
        ):
            self.assertNotIn(stale,status)
        self.assertIn("commercial-operations-facts.template.json",runbook)
        self.assertIn("finished stock is optional/volatile",runbook)
        self.assertIn("Maison has no discount mechanism",runbook)


if __name__=="__main__":
    unittest.main(verbosity=2)
