#!/usr/bin/env python3
from __future__ import annotations

import unittest

from critic import challenge
from foundry import propose
from prebrain import Signal, converge_signals
from scout import discover
from semantic_memory import SemanticDocument, SemanticMemoryError, make_metadata


class BrainRuntimeTests(unittest.TestCase):
    def test_prebrain_convergence_preserves_independent_roots(self):
        a=Signal("obs_a","seasonal","public_web","procura por presentes de natal sustentaveis",("evd_a",),("https://a.example/x",),"2026-09-23T10:00:00Z",.8,{})
        b=Signal("obs_b","seasonal","public_web","presentes natal sustentaveis procuram",("evd_b",),("https://b.example/y",),"2026-09-23T11:00:00Z",.9,{})
        groups=converge_signals((a,b),similarity_threshold=.4,minimum_independent_roots=2)
        self.assertEqual(len(groups),1)
        self.assertEqual(len(groups[0].independent_roots),2)
        self.assertGreater(groups[0].confidence,.8)

    def test_scout_existing_asset_first(self):
        g=converge_signals((
            Signal("obs_a","gifting","public_web","presentes personalizados",("evd_a",),("https://a.example",),"2026-09-23T10:00:00Z",.9,{ }),
        ),similarity_threshold=.5,minimum_independent_roots=1)[0]
        s=discover(g,existing_solution_ids=("sol_candle",),knowledge_context_refs=("ocean:casa",),candidate_offer_types=("corporate_gifting","physical_product"),minimum_confidence=.6)
        self.assertIn("existing_asset_first",s.reason_codes)
        self.assertEqual(s.status,"candidate")

    def test_critic_blocks_no_evidence(self):
        v=challenge(evidence_refs=(),independent_root_count=0,existing_solution_ids=(),claimed_economics={},operational_constraints={})
        self.assertFalse(v.safe_to_forward)
        self.assertIn("no_canonical_evidence",v.objections)


    def test_scout_marks_organic_discovery_for_acquisition_and_reuse(self):
        g=converge_signals((
            Signal("obs_d","organic_discovery","public_web","people repeatedly ask why they stay in dead relationships",("evd_d",),("https://a.example",),"2026-09-27T00:00:00Z",.9,{}),
        ),similarity_threshold=.5,minimum_independent_roots=1)[0]
        s=discover(g,existing_solution_ids=("ebook:para-de-ignorar",),knowledge_context_refs=("ocean:relationships",),candidate_offer_types=(),minimum_confidence=.6)
        self.assertIn("organic_acquisition_candidate",s.reason_codes)
        self.assertIn("maison_destination",s.acquisition_requirements)
        self.assertIn("game_question",s.reuse_routes)
        self.assertIn("guide_or_ebook",s.reuse_routes)

    def test_critic_requires_complete_organic_acquisition_path(self):
        v=challenge(
            evidence_refs=("evd_1",),
            independent_root_count=2,
            existing_solution_ids=("ebook:existing",),
            claimed_economics={"expected_contribution_minor":100,"capital_required_minor":0,"days_to_cash":1,"human_effort_minutes":10},
            operational_constraints={"capacity":True,"stock":True,"legal_or_safety_review":True,"delivery_feasibility":True},
            territory_key="organic_discovery",
            acquisition_context={"attention_evidence":"search demand","distribution_surface":"search"},
        )
        self.assertEqual(v.status,"enrich_or_review")
        self.assertIn("acquisition:maison_destination",v.missing_evidence)
        self.assertIn("acquisition:measurement_plan",v.missing_evidence)

    def test_critic_forwards_complete_zero_cost_organic_path(self):
        ctx={
            "attention_evidence":"two independent public signals",
            "distribution_surface":"search and AI discovery",
            "audience_or_human_signal":"latent relationship uncertainty",
            "identification_trigger":"this is about me",
            "zero_cost_route":"existing indexable page",
            "maison_destination":"ebook:para-de-ignorar",
            "scale_or_propagation_mechanism":"repeatable search demand",
            "measurement_plan":"GSC organic clicks and landing sessions",
        }
        v=challenge(
            evidence_refs=("evd_1","evd_2"),
            independent_root_count=2,
            existing_solution_ids=("ebook:para-de-ignorar",),
            claimed_economics={"expected_contribution_minor":100,"capital_required_minor":0,"days_to_cash":1,"human_effort_minutes":10},
            operational_constraints={"capacity":True,"stock":True,"legal_or_safety_review":True,"delivery_feasibility":True},
            territory_key="organic_discovery",
            acquisition_context=ctx,
        )
        self.assertTrue(v.safe_to_forward)
        self.assertEqual(v.status,"forward")

    def test_foundry_supports_non_digital_outputs(self):
        concepts=propose(
            opportunity_key="opp_test",
            candidate_offer_types=("physical_product","workshop","wholesale","white_label"),
            existing_solution_ids=("sol_existing",),
            economics={},
            validation_modes={"physical_product":"small_batch","workshop":"manual_booking","wholesale":"b2b_outreach","white_label":"b2b_pilot"},
        )
        self.assertEqual({x.offer_type for x in concepts},{"physical_product","workshop","wholesale","white_label"})
        self.assertTrue(all(x.source=="existing_asset_extension" for x in concepts))

    def test_semantic_memory_rejects_paid_oracle_content(self):
        with self.assertRaises(SemanticMemoryError):
            make_metadata(SemanticDocument(
                "doc1","paid_oracle secret body",None,None,"OBSERVATION",None,"pt",.5,"internal_non_pii",{}
            ))


if __name__=="__main__":
    unittest.main(verbosity=2)
