#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from commercial_assets import CommercialAssetContext
from manual_pilot_dossier import PilotDossierError, build_pilot_dossier, dossier_to_dict


def physical_registry():
    fields={
        "inventory_quantity":None,
        "reserved_quantity":None,
        "unit_material_cost_minor":None,
        "packaging_cost_minor":None,
        "production_minutes_per_unit":None,
        "batch_capacity_units":None,
        "moq_units":None,
        "shelf_life_days":None,
        "supplier_lead_days":None,
    }
    return {
        "assets":[
            {
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
                "operational":dict(fields),
            },
            {
                "asset_ref":"catalog:product:vela-b",
                "asset_type":"physical_product",
                "name":"Vela B",
                "category":"vela",
                "description":"vela pausa casa",
                "search_context":["vela","pausa","casa"],
                "public":True,
                "lifecycle_status":"active",
                "price_minor":1200,
                "currency":"EUR",
                "catalogue_availability":"in_stock",
                "operational":dict(fields),
            },
        ]
    }


def base_plan(plan_kind="manual_physical_pilot"):
    return {
        "validation_plan_id":"vpl_"+"1"*36,
        "opportunity_id":"opp_"+"2"*36,
        "offer_hypothesis_id":"ofh_"+"3"*36,
        "plan_kind":plan_kind,
        "state":"manual_pilot_required",
        "hypothesis":"Uma vela para pausa em casa pode gerar compra observável.",
        "territory_code":"pausa_casa",
        "offer_type":"physical_product" if plan_kind=="manual_physical_pilot" else "service",
        "validation_mode":"manual_pilot",
        "economics":{"reference_price_minor":1000},
        "evidence_refs":["evd_1"],
        "reason_codes":["validation_must_match_purchase_behaviour"],
    }


class ManualPilotDossierTests(unittest.TestCase):
    def test_rejects_non_manual_plan(self):
        with self.assertRaisesRegex(PilotDossierError,"manual_validation_plan_required"):
            build_pilot_dossier(
                {**base_plan(),"plan_kind":"a8_cta_existing_solution"},
                assets=CommercialAssetContext(physical_registry()),
            )

    def test_split_operational_facts_across_candidates_do_not_fake_readiness(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T04:00:00+01:00",
            "assets":[
                {
                    "asset_ref":"catalog:product:vela-a",
                    "operational":{
                        "inventory_quantity":5,
                        "unit_material_cost_minor":200,
                        "packaging_cost_minor":50,
                    },
                    "evidence_refs":["manual:ops:a"],
                },
                {
                    "asset_ref":"catalog:product:vela-b",
                    "operational":{
                        "production_minutes_per_unit":20,
                        "batch_capacity_units":8,
                    },
                    "evidence_refs":["manual:ops:b"],
                },
            ],
        }
        dossier=build_pilot_dossier(
            base_plan(),
            assets=CommercialAssetContext(physical_registry(),overlay=overlay),
        )
        self.assertEqual(dossier.ready_state,"needs_input")
        self.assertIn(
            "single_physical_candidate_with_complete_operational_facts",
            dossier.required_inputs,
        )
        self.assertFalse(dossier.experiment_execution_authorized)

    def test_one_complete_physical_candidate_can_reach_human_action_review(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T04:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:vela-a",
                "operational":{
                    "inventory_quantity":5,
                    "reserved_quantity":0,
                    "unit_material_cost_minor":200,
                    "packaging_cost_minor":50,
                    "production_minutes_per_unit":20,
                    "batch_capacity_units":8,
                },
                "evidence_refs":["manual:ops:complete"],
            }],
        }
        dossier=build_pilot_dossier(
            base_plan(),
            assets=CommercialAssetContext(physical_registry(),overlay=overlay),
        )
        self.assertEqual(dossier.ready_state,"ready_for_human_action_review")
        self.assertEqual(dossier.required_inputs,())
        payload=dossier_to_dict(dossier)
        self.assertFalse(payload["outbound_authorized"])
        self.assertFalse(payload["spend_authorized"])
        self.assertFalse(payload["public_write_authorized"])
        self.assertFalse(payload["experiment_execution_authorized"])
        self.assertIn("manual:ops:complete",payload["evidence_refs"])

    def test_physical_pilot_can_reach_human_review_without_finished_stock_count(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-24T08:15:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:vela-a",
                "operational":{
                    "unit_material_cost_minor":200,
                    "packaging_cost_minor":50,
                    "production_minutes_per_unit":20,
                    "batch_capacity_units":8,
                },
                "evidence_refs":["manual:ops:replenishable"],
            }],
        }
        dossier=build_pilot_dossier(
            base_plan(),
            assets=CommercialAssetContext(physical_registry(),overlay=overlay),
        )
        self.assertEqual(dossier.ready_state,"ready_for_human_action_review")
        self.assertNotIn("inventory_quantity",dossier.required_inputs)
        self.assertNotIn("reserved_quantity",dossier.required_inputs)
        self.assertFalse(dossier.experiment_execution_authorized)

    def test_private_b2b_context_can_complete_non_asset_inputs_without_granting_authority(self):
        plan={
            **base_plan("manual_b2b_pilot"),
            "offer_type":"b2b",
            "economics":{},
        }
        dossier=build_pilot_dossier(
            plan,
            assets=CommercialAssetContext({"assets":[]}),
            pilot_context={
                "inputs":{
                    "target_profile":"retalhistas independentes com decisão local",
                    "capacity_basis":"máximo de 4 projectos por mês",
                    "unit_or_project_cost_minor":1200,
                    "price_or_quote_rule":"orçamento humano por âmbito",
                    "fulfilment_lead_time_days":7,
                    "explicit_new_offer_decision_ref":"manual:offer-decision:1",
                },
                "evidence_refs":["manual:pilot-context:b2b"],
            },
        )
        self.assertEqual(dossier.ready_state,"ready_for_human_action_review")
        self.assertEqual(dossier.required_inputs,())
        payload=dossier_to_dict(dossier)
        self.assertFalse(payload["outbound_authorized"])
        self.assertFalse(payload["spend_authorized"])
        self.assertFalse(payload["public_write_authorized"])
        self.assertFalse(payload["experiment_execution_authorized"])
        self.assertIn("manual:pilot-context:b2b",payload["evidence_refs"])
        self.assertIn(
            "private_evidence_backed_pilot_context_applied",
            payload["reason_codes"],
        )

    def test_private_distribution_context_creates_a_real_path_to_human_review(self):
        plan={
            **base_plan("manual_distribution_pilot"),
            "offer_type":"partnership",
            "economics":{},
        }
        dossier=build_pilot_dossier(
            plan,
            assets=CommercialAssetContext({"assets":[]}),
            pilot_context={
                "inputs":{
                    "amplifier_or_partner_ref":"partner:curated:1",
                    "activation_strategy":"ZERO_CASH_PR",
                    "direct_cost_minor":0,
                    "attribution_method":"dedicated_landing_tag",
                    "explicit_new_offer_decision_ref":"manual:channel-decision:1",
                },
                "evidence_refs":["manual:pilot-context:distribution"],
            },
        )
        self.assertEqual(dossier.ready_state,"ready_for_human_action_review")
        self.assertEqual(dossier.required_inputs,())
        self.assertFalse(dossier.outbound_authorized)

    def test_generic_manual_validation_can_use_private_evidence_backed_scope(self):
        plan={
            **base_plan("manual_validation"),
            "offer_type":"new_offer_family",
            "economics":{},
        }
        dossier=build_pilot_dossier(
            plan,
            assets=CommercialAssetContext({"assets":[]}),
            pilot_context={
                "inputs":{
                    "purchase_behaviour":"pedido de informação qualificado seguido de proposta",
                    "pilot_scope":"3 conversas humanas sem automação",
                    "cost_basis":"tempo humano observado; sem media paga",
                    "capacity_basis":"máximo de 3 conversas nesta validação",
                    "explicit_new_offer_decision_ref":"manual:new-offer:1",
                },
                "evidence_refs":["manual:pilot-context:generic"],
            },
        )
        self.assertEqual(dossier.ready_state,"ready_for_human_action_review")
        self.assertEqual(dossier.required_inputs,())
        self.assertFalse(dossier.experiment_execution_authorized)


    def test_no_asset_match_stays_blocked(self):
        plan={
            **base_plan(),
            "hypothesis":"Oferta completamente alheia sem correspondência lexical suficiente.",
            "territory_code":"xyz_sem_match",
            "offer_type":"physical_product",
        }
        dossier=build_pilot_dossier(
            plan,
            assets=CommercialAssetContext(physical_registry()),
        )
        self.assertEqual(dossier.ready_state,"needs_input")
        self.assertIn(
            "existing_asset_match_or_explicit_new_offer_decision",
            dossier.required_inputs,
        )


if __name__=="__main__":
    unittest.main(verbosity=2)
