#!/usr/bin/env python3
from __future__ import annotations

import unittest

from commercial_discovery import assess_gap, make_commercial_candidate
from decision_engine import PrivacyViolation, ValidationError, commercial_score, decide, discovery_score, evaluate_hard_gates, recommend_existing_solution

RUL = "rul_" + "1"*36
SOL1 = "sol_" + "1"*36
SOL2 = "sol_" + "2"*36
NED = "ned_" + "3"*36
INT = "int_" + "4"*36
E1 = "evd_" + "5"*36
E2 = "evd_" + "6"*36

DISCOVERY = {
    "semantic_distinction": 90, "demand_evidence": 90, "coverage_gap": 90, "public_utility": 90,
    "commercial_adjacency": 80, "evidence_confidence": 90, "strategic_value": 80, "interlink_capacity": 80
}
COMMERCIAL = {
    "recurring_demand": 90, "real_gap": 90, "action_willingness": 70, "economic_potential": 70,
    "repeatability": 80, "differentiation": 80, "maison_fit": 90, "viability": 80
}
CORE = {"privacy_ok":True,"architecture_compatible":True,"paid_value_protected":True,"no_forbidden_mutation":True}
PROMO = {**CORE,"semantic_distinct":True,"coverage_not_sufficient":True,"no_material_cannibalization":True,"editorial_risk_acceptable":True,"maison_adjacency":True,"evidence_sufficient":True}


def ctx(**extra):
    base = {
        "rule_version_id":RUL,
        "requested_decision":"observe",
        "hard_gates":CORE,
        "discovery_dimensions":DISCOVERY,
        "confidence_score":88,
        "evidence_refs":[E1,E2],
        "evidence_sources":["gsc","site"],
        "brain_state":"observe",
        "public_coverage":"none",
    }
    base.update(extra); return base

class A7Tests(unittest.TestCase):
    def test_discovery_score(self): self.assertTrue(0 <= discovery_score(DISCOVERY).score <= 100)
    def test_commercial_score(self): self.assertTrue(0 <= commercial_score(COMMERCIAL).score <= 100)
    def test_unknown_score_dimension_rejected(self):
        bad=dict(DISCOVERY); bad["x"]=1
        with self.assertRaises(ValidationError): discovery_score(bad)
    def test_gate_order_contract(self):
        d=decide(ctx())
        self.assertEqual(d.evaluation_order[0],"hard_gates")
    def test_missing_gate_blocks(self):
        gates=dict(CORE); gates.pop("privacy_ok")
        d=decide(ctx(hard_gates=gates))
        self.assertFalse(d.hard_gates_passed); self.assertEqual(d.decision,"observe")
    def test_high_score_cannot_override_gate(self):
        gates=dict(PROMO); gates["no_material_cannibalization"]=False
        d=decide(ctx(requested_decision="propose_promotion",hard_gates=gates,discovery_dimensions={k:100 for k in DISCOVERY}))
        self.assertEqual(d.discovery_score,100); self.assertEqual(d.decision,"observe"); self.assertFalse(d.hard_gates_passed)
    def test_promotion_valid(self):
        d=decide(ctx(requested_decision="propose_promotion",hard_gates=PROMO))
        self.assertEqual(d.decision,"propose_promotion"); self.assertTrue(d.human_review_required)
    def test_promotion_needs_two_sources(self):
        d=decide(ctx(requested_decision="propose_promotion",hard_gates=PROMO,evidence_sources=["gsc"]))
        self.assertEqual(d.decision,"observe")
    def test_alias(self): self.assertEqual(decide(ctx(brain_state="alias_candidate")).decision,"alias")
    def test_reinforce(self): self.assertEqual(decide(ctx(public_coverage="partial")).decision,"reinforce")
    def test_interlink_redundant(self): self.assertEqual(decide(ctx(public_coverage="redundant")).decision,"interlink")
    def test_content_gap_internal(self): self.assertEqual(decide(ctx(gap_type="content")).decision,"create_internal_candidate")
    def test_product_gap(self):
        d=decide(ctx(gap_type="product",commercial_dimensions=COMMERCIAL))
        self.assertEqual(d.decision,"commercial_gap"); self.assertTrue(d.human_review_required)
    def test_journey_gap_recommend_solution(self):
        solutions=[{"solution_id":SOL1,"fit_strength":90,"journey_support":80,"economic_confidence":70}]
        d=decide(ctx(gap_type="journey",existing_solutions=solutions))
        self.assertEqual(d.decision,"recommend_solution"); self.assertEqual(d.recommended_solution_id,SOL1)
    def test_journey_gap_test_cta_is_proposal_only(self):
        solutions=[{"solution_id":SOL1,"fit_strength":90,"journey_support":80,"economic_confidence":70}]
        d=decide(ctx(gap_type="journey",existing_solutions=solutions,cta_test_relevant=True))
        self.assertEqual(d.decision,"test_cta"); self.assertFalse(d.public_side_effects)
    def test_solution_recommendation_deterministic(self):
        sols=[{"solution_id":SOL1,"fit_strength":80,"journey_support":70,"economic_confidence":80},{"solution_id":SOL2,"fit_strength":90,"journey_support":60,"economic_confidence":60}]
        self.assertEqual(recommend_existing_solution(sols),SOL2)
    def test_conflicting_evidence_forces_observe(self):
        d=decide(ctx(conflicting_evidence=True,requested_decision="propose_promotion",hard_gates=PROMO))
        self.assertEqual(d.decision,"observe"); self.assertLessEqual(d.confidence_score,59)
    def test_direct_pii_rejected(self):
        with self.assertRaises(PrivacyViolation): decide(ctx(note="person@example.com"))
    def test_paid_oracle_content_field_rejected(self):
        with self.assertRaises(PrivacyViolation): decide(ctx(oracle_answer="secret paid text"))
    def test_unknown_gate_rejected(self):
        with self.assertRaises(ValidationError): evaluate_hard_gates({**CORE,"made_up":True},for_promotion=False)
    def test_gap_product_without_solution(self):
        g=assess_gap(gap_type="product",evidence_refs=[E1,E2],existing_solutions=[],confidence_score=84)
        self.assertEqual(g.status,"detected"); self.assertIsNone(g.recommended_solution_id)
    def test_gap_product_existing_solution_observe(self):
        sols=[{"solution_id":SOL1,"fit_strength":90,"journey_support":80,"economic_confidence":70}]
        g=assess_gap(gap_type="product",evidence_refs=[E1],existing_solutions=sols,confidence_score=80)
        self.assertEqual(g.status,"observe"); self.assertEqual(g.recommended_solution_id,SOL1)
    def test_positioning_gap_existing_solution(self):
        sols=[{"solution_id":SOL1,"fit_strength":90,"journey_support":80,"economic_confidence":70}]
        g=assess_gap(gap_type="positioning",evidence_refs=[E1],existing_solutions=sols,confidence_score=80,positioning_mismatch=True)
        self.assertIn("positioning_mismatch_with_existing_solution",g.reason_codes)
    def test_commercial_candidate_human_only(self):
        g=assess_gap(gap_type="product",evidence_refs=[E1,E2],existing_solutions=[],confidence_score=84)
        c=make_commercial_candidate(working_name="Hypothesis",candidate_type="digital_product",primary_need_id=NED,intent_ids=[INT],gap=g,commercial_dimensions=COMMERCIAL,economy={"currency":"EUR","expected_value_minor":900},complexity_class="medium",human_effort_class="low",risk_class="low",differentiation_score=80,rule_version_id=RUL)
        self.assertEqual(c["status"],"human_review_required"); self.assertFalse(c["launch_authorized"]); self.assertFalse(c["price_authorized"]); self.assertFalse(c["public_side_effects"])
    def test_candidate_blocked_if_existing_solution(self):
        sols=[{"solution_id":SOL1,"fit_strength":90,"journey_support":80,"economic_confidence":70}]
        g=assess_gap(gap_type="product",evidence_refs=[E1],existing_solutions=sols,confidence_score=80)
        with self.assertRaises(ValidationError):
            make_commercial_candidate(working_name="No",candidate_type="service",primary_need_id=NED,intent_ids=[INT],gap=g,commercial_dimensions=COMMERCIAL,economy={},complexity_class="low",human_effort_class="low",risk_class="low",differentiation_score=20,rule_version_id=RUL)
    def test_candidate_only_product_gap(self):
        g=assess_gap(gap_type="content",evidence_refs=[E1],existing_solutions=[],confidence_score=80)
        with self.assertRaises(ValidationError):
            make_commercial_candidate(working_name="No",candidate_type="ebook",primary_need_id=NED,intent_ids=[INT],gap=g,commercial_dimensions=COMMERCIAL,economy={},complexity_class="low",human_effort_class="low",risk_class="low",differentiation_score=20,rule_version_id=RUL)
    def test_reason_codes_and_evidence_present(self):
        d=decide(ctx())
        self.assertTrue(d.reason_codes); self.assertEqual(set(d.evidence_refs),{E1,E2})
    def test_discovery_commercial_values_separate(self):
        d=decide(ctx(commercial_dimensions=COMMERCIAL))
        self.assertIsNotNone(d.discovery_score); self.assertIsNotNone(d.commercial_score)
    def test_no_public_side_effects(self): self.assertFalse(decide(ctx()).public_side_effects)

if __name__ == "__main__": unittest.main()
