#!/usr/bin/env python3
from __future__ import annotations
import unittest
from validation_planner import build_validation_plan,a8_eligibility

BASE={
 "review_resolution_id":"rvr_"+"1"*36,
 "opportunity_id":"opp_"+"2"*36,
 "offer_hypothesis_id":"ofh_"+"3"*36,
 "decision":"approved","approved_scope":"experiment_planning_only",
 "territory_code":"gifting","evidence_refs_json":"[]","reason_codes_json":"[]"
}

class ValidationPlannerTests(unittest.TestCase):
 def test_b2b_does_not_get_forced_into_cta_experiment(self):
  row={**BASE,"offer_type":"corporate_gifting","validation_mode":"b2b_pilot","existing_solution_id":None}
  plan=build_validation_plan(row)
  self.assertEqual(plan["plan_kind"],"manual_b2b_pilot")
  self.assertEqual(plan["state"],"manual_pilot_required")
  self.assertFalse(plan["experiment_execution_authorized"])

 def test_physical_offer_uses_physical_pilot(self):
  row={**BASE,"offer_type":"physical_product","validation_mode":"micro_batch","existing_solution_id":None}
  plan=build_validation_plan(row)
  self.assertEqual(plan["plan_kind"],"manual_physical_pilot")

 def test_existing_solution_cta_requires_a7(self):
  sol="sol_"+"4"*36
  row={**BASE,"offer_type":"service","validation_mode":"cta_test","existing_solution_id":sol}
  plan=build_validation_plan(row)
  self.assertEqual(plan["plan_kind"],"a8_cta_existing_solution")
  self.assertEqual(plan["state"],"blocked_needs_a7_decision")
  self.assertEqual(a8_eligibility(plan,a7_decision=None)["reason"],"canonical_a7_decision_required")

 def test_a8_requires_matching_test_cta_decision(self):
  sol="sol_"+"4"*36
  row={**BASE,"offer_type":"service","validation_mode":"cta_test","existing_solution_id":sol}
  plan=build_validation_plan(row)
  bad={"decision_type":"recommend_solution","hard_gates_passed":1,"recommended_solution_id":sol}
  self.assertFalse(a8_eligibility(plan,a7_decision=bad)["eligible"])
  good={"decision_type":"test_cta","hard_gates_passed":1,"recommended_solution_id":sol}
  result=a8_eligibility(plan,a7_decision=good)
  self.assertTrue(result["eligible"])
  self.assertFalse(result["experiment_execution_authorized"])
  self.assertFalse(result["public_write_authorized"])

if __name__=="__main__":
 unittest.main(verbosity=2)
