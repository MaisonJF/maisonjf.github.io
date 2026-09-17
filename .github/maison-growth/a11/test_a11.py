#!/usr/bin/env python3
import unittest
from engine import LearningInput,evaluate,feedback,detect_repeated_pattern,propose_sensitive_adjustment,assert_no_protected_mutation,ProtectedMutationError

RUL="rul_"+"a"*36
MDL="mdl_"+"b"*36
SID="dec_"+"c"*36
def inp(**kw):
    base=dict(source_kind="decision",source_id=SID,expected_economic_value_minor=1000,observed_economic_value_minor=1300,
      expected_ctr_bps=500,observed_ctr_bps=600,observation_count=10,economic_observation_count=5,
      evidence_refs=("ev1","ev2"),subject_type="decision",subject_id=SID)
    base.update(kw); return LearningInput(**base)

class A11Tests(unittest.TestCase):
    def test_success_positive(self):
        r=evaluate(inp(),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"positive"); self.assertGreater(r.confidence_delta,0)
    def test_worse_negative(self):
        r=evaluate(inp(observed_economic_value_minor=700),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"negative"); self.assertLess(r.confidence_delta,0)
    def test_neutral(self):
        r=evaluate(inp(observed_economic_value_minor=1030),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"neutral")
    def test_insufficient_count(self):
        r=evaluate(inp(observation_count=2),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"insufficient")
    def test_insufficient_economics(self):
        r=evaluate(inp(economic_observation_count=0,observed_economic_value_minor=None),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"insufficient")
    def test_ctr_positive_economics_negative(self):
        r=evaluate(inp(observed_economic_value_minor=700,observed_ctr_bps=900),confidence_before=50,rule_version_id=RUL)
        self.assertEqual(r.signal_class,"negative"); self.assertIn("CTR_POSITIVE_ECONOMIC_NEGATIVE",r.reason_codes)
    def test_ctr_negative_economics_positive(self):
        r=evaluate(inp(observed_economic_value_minor=1500,observed_ctr_bps=300),confidence_before=50,rule_version_id=RUL)
        self.assertEqual(r.signal_class,"positive"); self.assertIn("CTR_NEGATIVE_ECONOMIC_POSITIVE",r.reason_codes)
    def test_feedback(self):
        r=evaluate(inp(),confidence_before=50,rule_version_id=RUL); f=feedback(r); self.assertEqual(f["action"],"increase_confidence"); self.assertFalse(f["public_side_effects"])
    def test_all_source_kinds_supported(self):
        source_ids={"decision":"dec_"+"1"*36,"experiment":"xrs_"+"2"*36,"journey":"jns_"+"3"*36,"conversion":"cnv_"+"4"*36,"promotion":"opm_"+"5"*36}
        for kind,sid in source_ids.items():
            r=evaluate(inp(source_kind=kind,source_id=sid),confidence_before=50,rule_version_id=RUL)
            self.assertEqual(r.signal_class,"positive")
    def test_repeated_pattern(self):
        rs=[evaluate(inp(source_id="dec_"+str(i)*36),confidence_before=50,rule_version_id=RUL) for i in ("1","2","3")]
        p=detect_repeated_pattern(rs,"decision:promo"); self.assertTrue(p["correlation_only"]); self.assertFalse(p["causal_claim"]); self.assertEqual(p["occurrence_count"],3)
    def test_pattern_not_from_conflict(self):
        a=evaluate(inp(source_id="dec_"+"1"*36),confidence_before=50,rule_version_id=RUL)
        b=evaluate(inp(source_id="dec_"+"2"*36,observed_economic_value_minor=500),confidence_before=50,rule_version_id=RUL)
        c=evaluate(inp(source_id="dec_"+"3"*36),confidence_before=50,rule_version_id=RUL)
        self.assertIsNone(detect_repeated_pattern([a,b,c],"mixed"))
    def test_sensitive_proposal_human(self):
        p=propose_sensitive_adjustment("hard_gates","Consider reviewing threshold",["ev1"]); self.assertFalse(p["execution_authorized"]); self.assertEqual(p["status"],"human_review_required")
    def test_protected_mutation_denied(self):
        with self.assertRaises(ProtectedMutationError): assert_no_protected_mutation(["hard_gates.write"])
    def test_model_version_supported(self):
        r=evaluate(inp(),confidence_before=50,rule_version_id=RUL,model_version_id=MDL); self.assertEqual(r.model_version_id,MDL)
    def test_confidence_clamped(self):
        r=evaluate(inp(),confidence_before=98,rule_version_id=RUL); self.assertEqual(r.confidence_after,100)
    def test_missing_expected_economic_neutral(self):
        r=evaluate(inp(expected_economic_value_minor=None),confidence_before=50,rule_version_id=RUL); self.assertEqual(r.signal_class,"neutral")

if __name__=="__main__": unittest.main()
