#!/usr/bin/env python3
import unittest
from experiment_manager import (
 Variant,Definition,ValidationError,PrivacyViolation,ConflictError,validate_definition,
 snapshot,rollback_plan,assign,exposure_idempotency_key,assert_no_conflict,next_state,
 evaluate,stop_rule_decision,summarize_variant
)

SOL1="sol_"+"1"*36; SOL2="sol_"+"2"*36
def definition(primary="economic_value_per_eligible_session",split=(8000,2000)):
    return Definition(
      hypothesis="Routing this eligible CTA to the existing solution improves economic value without harming users.",
      eligible_population={"asset_type":"ocean","territory":"relationships"},
      primary_metric=primary,secondary_metrics=("cta_click_rate","conversion_rate"),
      stop_rules={"min_exposures":100,"max_exposures":2000,"worse_guardrail_bps":1000},
      success_criteria={"neutral_band_bps":200},
      compatibility_key="asset:ast_demo:cta:primary",
      variants=(Variant("control",split[0],{"destination_solution_id":SOL1}),
                Variant("variant_a",split[1],{"destination_solution_id":SOL2})),
      policy_version="experiment_policy_1"
    )

class A8Tests(unittest.TestCase):
 def test_valid_80_20_definition(self): validate_definition(definition())
 def test_split_must_total_10000(self):
  with self.assertRaises(ValidationError): validate_definition(definition(split=(7000,2000)))
 def test_protected_price_rejected(self):
  d=definition(); bad=Variant("variant_a",2000,{"destination_solution_id":SOL2,"price_minor":100})
  with self.assertRaises(ValidationError): validate_definition(Definition(**{**d.__dict__,"variants":(d.variants[0],bad)}))
 def test_checkout_rejected(self):
  d=definition(); bad=Variant("variant_a",2000,{"checkout":"x"})
  with self.assertRaises(ValidationError): validate_definition(Definition(**{**d.__dict__,"variants":(d.variants[0],bad)}))
 def test_paid_oracle_field_rejected(self):
  d=definition()
  with self.assertRaises(PrivacyViolation): validate_definition(Definition(**{**d.__dict__,"eligible_population":{"oracle_answer":"secret"}}))
 def test_direct_pii_rejected(self):
  d=definition()
  with self.assertRaises(PrivacyViolation): validate_definition(Definition(**{**d.__dict__,"hypothesis":"Send x@example.com toward the correct solution safely."}))
 def test_snapshot_exact_hash(self):
  s=snapshot({"source_asset_id":"ast_"+"a"*36,"cta_slot_key":"primary","destination_solution_id":SOL1,"state_version":"v7"})
  self.assertEqual(len(s["previous_state_hash"]),64)
 def test_snapshot_unknown_field_rejected(self):
  with self.assertRaises(ValidationError): snapshot({"source_asset_id":"ast_"+"a"*36,"cta_slot_key":"p","destination_solution_id":SOL1,"state_version":"1","price":2})
 def test_rollback_is_exact_snapshot(self):
  s=snapshot({"source_asset_id":"ast_"+"a"*36,"cta_slot_key":"primary","destination_solution_id":SOL1,"state_version":"v7"})
  r=rollback_plan(s,reason_codes=("worse",))
  self.assertEqual(r["rollback_target"],s["previous_state"]); self.assertEqual(r["rollback_target_hash"],s["previous_state_hash"])
  self.assertTrue(r["publisher_gateway_required"]); self.assertFalse(r["public_side_effects"])
 def test_rollback_tamper_detected(self):
  s=snapshot({"source_asset_id":"ast_"+"a"*36,"cta_slot_key":"primary","destination_solution_id":SOL1,"state_version":"v7"})
  s["previous_state"]["state_version"]="tampered"
  with self.assertRaises(ValidationError): rollback_plan(s,reason_codes=("worse",))
 def test_assignment_deterministic(self):
  d=definition(); key="f"*64
  a=assign("exv_"+"1"*36,key,d.variants); b=assign("exv_"+"1"*36,key,d.variants)
  self.assertEqual(a,b)
 def test_assignment_eligible(self):
  d=definition(); a=assign("exv_"+"1"*36,"e"*64,d.variants); self.assertTrue(a.eligible); self.assertIn(a.variant_key,{"control","variant_a"})
 def test_assignment_ineligible(self):
  a=assign("exv_"+"1"*36,"e"*64,definition().variants,eligible=False); self.assertFalse(a.eligible); self.assertEqual(a.reason_code,"not_eligible")
 def test_pseudonymous_key_required(self):
  with self.assertRaises(ValidationError): assign("exv_"+"1"*36,"user@example.com",definition().variants)
 def test_idempotency_key_stable(self):
  a=exposure_idempotency_key("exv_"+"1"*36,"a"*64); b=exposure_idempotency_key("exv_"+"1"*36,"a"*64); self.assertEqual(a,b)
 def test_conflict_detected(self):
  claims=[{"compatibility_key":"same","scope_hash":"a"*64,"claim_state":"running","experiment_version_id":"exv_old"}]
  with self.assertRaises(ConflictError): assert_no_conflict(compatibility_key="same",scope_hash="a"*64,active_claims=claims)
 def test_released_claim_no_conflict(self):
  assert_no_conflict(compatibility_key="same",scope_hash="a"*64,active_claims=[{"compatibility_key":"same","scope_hash":"a"*64,"claim_state":"released"}])
 def test_state_lifecycle(self):
  self.assertEqual(next_state(None,"draft"),"draft"); self.assertEqual(next_state("draft","ready"),"ready"); self.assertEqual(next_state("ready","running"),"running")
 def test_invalid_state_transition(self):
  with self.assertRaises(ValidationError): next_state("draft","completed")
 def test_metric_summary_separates_ctr_and_economics(self):
  s=summarize_variant([{"eligible_session":100,"cta_click":20,"conversion":4,"economic_value_minor":5000}])
  self.assertEqual(s["cta_click_rate"],.2); self.assertEqual(s["economic_value_per_eligible_session"],50)
 def test_insufficient_sample(self):
  e=evaluate({"eligible_session":99,"economic_value_minor":9900},{"eligible_session":99,"economic_value_minor":10000},primary_metric="economic_value_per_eligible_session",min_exposures=100)
  self.assertEqual(e.outcome,"insufficient"); self.assertFalse(e.stop_recommended)
 def test_worse_performance_recommends_rollback(self):
  e=evaluate({"eligible_session":100,"economic_value_minor":10000},{"eligible_session":100,"economic_value_minor":7000},primary_metric="economic_value_per_eligible_session",min_exposures=100)
  self.assertEqual(e.outcome,"worse"); self.assertTrue(e.rollback_recommended); self.assertEqual(stop_rule_decision(e,max_exposures=2000)["action"],"prepare_rollback")
 def test_neutral_conclusion(self):
  e=evaluate({"eligible_session":120,"economic_value_minor":12000},{"eligible_session":120,"economic_value_minor":12120},primary_metric="economic_value_per_eligible_session",min_exposures=100)
  self.assertEqual(e.outcome,"neutral")
 def test_success_conclusion(self):
  e=evaluate({"eligible_session":120,"economic_value_minor":12000},{"eligible_session":120,"economic_value_minor":15000},primary_metric="economic_value_per_eligible_session",min_exposures=100)
  self.assertEqual(e.outcome,"success")
 def test_technical_guardrail(self):
  e=evaluate({"eligible_session":1},{"eligible_session":1},primary_metric="economic_value_per_eligible_session",min_exposures=100,technical_stop=True)
  self.assertEqual(e.outcome,"worse"); self.assertTrue(e.rollback_recommended)
 def test_max_sample_completion(self):
  e=evaluate({"eligible_session":100,"economic_value_minor":10000},{"eligible_session":100,"economic_value_minor":10100},primary_metric="economic_value_per_eligible_session",min_exposures=100)
  self.assertEqual(stop_rule_decision(e,max_exposures=200)["action"],"complete")
 def test_ctr_primary_supported_but_distinct(self):
  e=evaluate({"eligible_session":100,"cta_click":10,"economic_value_minor":5000},{"eligible_session":100,"cta_click":20,"economic_value_minor":3000},primary_metric="cta_click_rate",min_exposures=100)
  self.assertEqual(e.outcome,"success"); self.assertLess(e.metrics["variant"]["economic_value_per_eligible_session"],e.metrics["control"]["economic_value_per_eligible_session"])
 def test_no_product_launch_field(self):
  d=definition(); bad=Variant("variant_a",2000,{"launch":True})
  with self.assertRaises(ValidationError): validate_definition(Definition(**{**d.__dict__,"variants":(d.variants[0],bad)}))

if __name__=="__main__": unittest.main(verbosity=2)
