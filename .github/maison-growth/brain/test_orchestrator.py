#!/usr/bin/env python3
from __future__ import annotations

import unittest

from orchestrator import run_brain_cycle


class OrchestratorTests(unittest.TestCase):
    def test_full_internal_cycle_reaches_a14_ready(self):
        rows=[
            {
                "observation_id":"obs_a","territory_key":"gifting","source_class":"public_web",
                "response_excerpt":"empresas procuram presentes personalizados de natal",
                "observed_at":"2026-09-23T10:00:00Z","confidence":.9,
                "independent_roots":'["https://a.example"]',"evidence_refs":'["evd_a"]',
                "provider_id":"osiris_news","model_id":None,"grounding_state":"grounded",
            },
            {
                "observation_id":"obs_b","territory_key":"gifting","source_class":"ai_web_grounded",
                "response_excerpt":"presentes personalizados natal para empresas procuram",
                "observed_at":"2026-09-23T11:00:00Z","confidence":.85,
                "independent_roots":'["https://b.example"]',"evidence_refs":'["evd_b"]',
                "provider_id":"openai","model_id":"test","grounding_state":"grounded",
            },
        ]
        packets=run_brain_cycle(
            rows=rows,similarity_threshold=.35,minimum_independent_roots=2,
            scout_minimum_confidence=.6,
            existing_solutions_by_territory={"gifting":("sol_candle",)},
            knowledge_context_by_territory={"gifting":("ocean:casa","semantic:gifting","osiris:entity:corporate-gifts")},
            candidate_offer_types_by_territory={"gifting":("corporate_gifting","white_label")},
            economics_by_territory={"gifting":{
                "corporate_gifting":{"expected_contribution_minor":50000,"capital_required_minor":10000,"days_to_cash":14,"human_effort_minutes":240},
                "white_label":{"expected_contribution_minor":None,"capital_required_minor":None,"days_to_cash":None,"human_effort_minutes":None},
            }},
            validation_modes={"corporate_gifting":"b2b_pilot","white_label":"b2b_pilot"},
            operational_constraints_by_territory={"gifting":{
                "capacity":"unknown_but_reviewed","stock":"existing_asset","legal_or_safety_review":"required_before_execution","delivery_feasibility":"manual_review",
            }},
        )
        self.assertEqual(len(packets),1)
        self.assertTrue(packets[0].a14_ready)
        self.assertEqual({c.offer_type for c in packets[0].offer_concepts},{"corporate_gifting","white_label"})

    def test_no_canonical_evidence_never_reaches_a14(self):
        rows=[{
            "observation_id":"obs_a","territory_key":"x","source_class":"ai_api",
            "response_excerpt":"uma hipotese sem fonte","observed_at":"2026-09-23T10:00:00Z",
            "confidence":.8,"independent_roots":"[]","evidence_refs":"[]",
            "provider_id":"openrouter","model_id":"m","grounding_state":"ungrounded",
        }]
        packets=run_brain_cycle(
            rows=rows,similarity_threshold=.5,minimum_independent_roots=2,
            scout_minimum_confidence=.6,
            existing_solutions_by_territory={},knowledge_context_by_territory={},
            candidate_offer_types_by_territory={"x":("service",)},economics_by_territory={},
            validation_modes={"service":"manual_offer"},
            operational_constraints_by_territory={},
        )
        self.assertFalse(packets[0].a14_ready)
        self.assertIn("no_canonical_evidence",packets[0].critic.objections)


if __name__=="__main__":
    unittest.main(verbosity=2)
