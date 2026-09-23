#!/usr/bin/env python3
from __future__ import annotations

import unittest

from a14_projection import metrics_from_explicit_config, project_packet_to_a14
from orchestrator import run_brain_cycle


def rows(need_a="ned_"+"1"*36, need_b=None):
    out=[
        {
            "observation_id":"obs_a","territory_key":"gifting","source_class":"public_web",
            "response_excerpt":"empresas procuram presentes personalizados de natal",
            "observed_at":"2026-09-23T10:00:00Z","confidence":.9,
            "independent_roots":["https://a.example"],"evidence_refs":["evd_a"],
            "provider_id":"eurostat_test","model_id":None,"grounding_state":"grounded",
            "need_id":need_a,"intent_id":None,"semantic_ambiguity":0,
        },
        {
            "observation_id":"obs_b","territory_key":"gifting","source_class":"public_web",
            "response_excerpt":"presentes personalizados natal para empresas procuram",
            "observed_at":"2026-09-23T11:00:00Z","confidence":.85,
            "independent_roots":["https://b.example"],"evidence_refs":["evd_b"],
            "provider_id":"base_test","model_id":None,"grounding_state":"grounded",
            "need_id":need_b if need_b is not None else need_a,
            "intent_id":None,"semantic_ambiguity":0,
        },
    ]
    return out


def packet(existing=("sol_"+"2"*36,)):
    return run_brain_cycle(
        rows=rows(),
        similarity_threshold=.35,
        minimum_independent_roots=2,
        scout_minimum_confidence=.6,
        existing_solutions_by_territory={"gifting":existing},
        knowledge_context_by_territory={"gifting":("ocean:gifting",)},
        candidate_offer_types_by_territory={"gifting":("corporate_gifting",)},
        economics_by_territory={},
        validation_modes={"corporate_gifting":"b2b_pilot"},
        operational_constraints_by_territory={},
    )[0]


class A14ProjectionTests(unittest.TestCase):
    def test_unknown_metrics_stay_unknown_but_canonical_evidence_survives(self):
        p=packet()
        preview=project_packet_to_a14(p,policy_by_territory={})
        self.assertEqual(preview.state,"enrichment_required")
        self.assertIsNone(preview.opportunity["opportunity_score"])
        self.assertEqual(preview.opportunity["need_id"],"ned_"+"1"*36)
        self.assertEqual(set(preview.opportunity["evidence_refs"]),{"evd_a","evd_b"})
        self.assertEqual(set(preview.offer_hypotheses[0]["evidence_refs"]),{"evd_a","evd_b"})
        self.assertFalse(preview.a12_review_payloads[0]["outbound_authorized"])
        self.assertFalse(preview.a12_review_payloads[0]["spend_authorized"])
        self.assertFalse(preview.a12_review_payloads[0]["public_write_authorized"])

    def test_multiple_existing_solutions_are_not_selected_arbitrarily(self):
        p=packet(("sol_"+"2"*36,"sol_"+"3"*36))
        preview=project_packet_to_a14(p,policy_by_territory={})
        offer=preview.offer_hypotheses[0]
        self.assertIsNone(offer["existing_solution_id"])
        self.assertIn("multiple_existing_solutions_require_explicit_selection",offer["reason_codes"])
        self.assertIn("existing_solution_selection_required",preview.reason_codes)

    def test_explicit_metric_and_solution_selection_can_create_review_preview(self):
        p=packet(("sol_"+"2"*36,"sol_"+"3"*36))
        cfg={
            "gifting":{
                "opportunity_metrics":{
                    "demand":{
                        "value":82,
                        "status":"INFERRED",
                        "confidence":.75,
                        "evidence_refs":"scout",
                    }
                },
                "existing_solution_by_offer":{
                    "corporate_gifting":"sol_"+"3"*36
                }
            }
        }
        preview=project_packet_to_a14(p,policy_by_territory=cfg)
        self.assertEqual(preview.state,"human_review_preview")
        self.assertEqual(preview.opportunity["opportunity_score"],82.0)
        self.assertEqual(preview.offer_hypotheses[0]["existing_solution_id"],"sol_"+"3"*36)

    def test_known_metric_without_evidence_is_rejected(self):
        with self.assertRaises(ValueError):
            metrics_from_explicit_config(
                {"demand":{"value":80,"status":"INFERRED","confidence":.7}},
                scout_evidence_refs=("evd_a",),
            )

    def test_conflicting_a5_need_mapping_remains_unresolved(self):
        p=run_brain_cycle(
            rows=rows("ned_"+"1"*36,"ned_"+"9"*36),
            similarity_threshold=.35,
            minimum_independent_roots=2,
            scout_minimum_confidence=.6,
            existing_solutions_by_territory={},
            knowledge_context_by_territory={},
            candidate_offer_types_by_territory={"gifting":("service",)},
            economics_by_territory={},
            validation_modes={"service":"manual"},
            operational_constraints_by_territory={},
        )[0]
        self.assertIsNone(p.scout.need_id)
        self.assertIn("a5_need_mapping_conflict",p.scout.reason_codes)


if __name__=="__main__":
    unittest.main(verbosity=2)
