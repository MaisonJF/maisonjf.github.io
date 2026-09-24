#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from commercial_assets import CommercialAssetContext
from manual_pilot_dossier_cli import build_operator_output


def registry():
    return {
        "assets":[{
            "asset_ref":"catalog:product:vela-a",
            "asset_type":"physical_product",
            "name":"Vela A",
            "category":"vela",
            "description":"vela pausa casa",
            "search_context":["vela","pausa","casa"],
            "public":True,
            "lifecycle_status":"active",
            "price_minor":1000,
            "currency":"EUR",
            "catalogue_availability":"in_stock",
            "operational":{
                "inventory_quantity":None,
                "reserved_quantity":None,
                "unit_material_cost_minor":None,
                "packaging_cost_minor":None,
                "production_minutes_per_unit":None,
                "batch_capacity_units":None,
                "moq_units":None,
                "shelf_life_days":None,
                "supplier_lead_days":None,
            },
        }]
    }


def row(plan_id="vpl_secret"):
    return {
        "validation_plan_id":plan_id,
        "opportunity_id":"opp_secret",
        "offer_hypothesis_id":"ofh_secret",
        "plan_kind":"manual_physical_pilot",
        "state":"manual_pilot_required",
        "hypothesis":"Uma vela para pausa em casa pode gerar compra observável.",
        "territory_code":"pausa_casa",
        "offer_type":"physical_product",
        "validation_mode":"manual_pilot",
        "economics":{},
        "evidence_refs":["evd_secret"],
        "reason_codes":["manual_pilot_requires_verified_stock"],
    }


class ManualPilotDossierCliTests(unittest.TestCase):
    def test_summary_only_drops_internal_identifiers(self):
        result=build_operator_output(
            [row()],
            assets=CommercialAssetContext(registry()),
            full=False,
        )
        rendered=json.dumps(result)
        self.assertEqual(result["counts"]["total"],1)
        self.assertFalse(result["writes_performed"])
        self.assertFalse(result["execution_authority"])
        self.assertFalse(result["identifiers_printed"])
        for secret in ("vpl_secret","opp_secret","ofh_secret","evd_secret"):
            self.assertNotIn(secret,rendered)
        self.assertTrue(result["most_common_required_inputs"])

    def test_full_mode_is_explicit_and_contains_operator_dossier(self):
        result=build_operator_output(
            [row("vpl_full")],
            assets=CommercialAssetContext(registry()),
            full=True,
        )
        self.assertEqual(result["mode"],"operator_full")
        self.assertEqual(result["dossiers"][0]["validation_plan_id"],"vpl_full")
        self.assertFalse(result["dossiers"][0]["experiment_execution_authorized"])

    def test_plan_filter_is_exact(self):
        result=build_operator_output(
            [row("vpl_a"),row("vpl_b")],
            assets=CommercialAssetContext(registry()),
            full=False,
            validation_plan_id="vpl_b",
        )
        self.assertEqual(result["counts"]["total"],1)


if __name__=="__main__":
    unittest.main(verbosity=2)
