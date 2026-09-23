#!/usr/bin/env python3
import unittest
from engine import SchedulerState,CircuitBreaker,autonomous_level,risk_for,DuplicateJobRun,KillSwitchActive,CircuitOpen,RateLimitExceeded,prioritized_inbox
from dashboard_v2 import why,build_dashboard_v2
RUL='rul_'+'a'*36

class A12Tests(unittest.TestCase):
 def test_commercial_opportunity_review_is_medium_and_human_gated(self):
  self.assertEqual(risk_for("commercial_opportunity_review"),"medium")
  level,reasons=autonomous_level("commercial_opportunity_review",10,100,"human_approval_required")
  self.assertEqual(level,"human_approval_required")
  self.assertIn("HUMAN_APPROVAL_REQUESTED",reasons)

 def st(self): s=SchedulerState(); s.kill_switch=False; return s
 def test_threshold_pass_low_risk(self):
  level,reasons=autonomous_level('internal_health_check',2,80,'low_risk_auto'); self.assertEqual(level,'low_risk_auto'); self.assertIn('LOW_RISK_AUTO_THRESHOLDS_PASSED',reasons)
 def test_threshold_evidence_fail(self): self.assertEqual(autonomous_level('internal_health_check',1,95,'low_risk_auto')[0],'recommend')
 def test_threshold_confidence_fail(self): self.assertEqual(autonomous_level('internal_health_check',3,79,'low_risk_auto')[0],'recommend')
 def test_high_risk_human(self): self.assertEqual(autonomous_level('public_content_write',9,99,'low_risk_auto')[0],'human_approval_required')
 def test_unknown_is_critical(self): self.assertEqual(risk_for('mystery'),'critical')
 def test_kill_switch(self):
  with self.assertRaises(KillSwitchActive): SchedulerState().run(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL)
 def test_low_risk_auto_simulated(self):
  r=self.st().run(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL); self.assertEqual(r['status'],'simulated_completed'); self.assertFalse(r['public_write_authorized'])
 def test_duplicate_job(self):
  s=self.st(); kw=dict(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL); s.run(**kw)
  with self.assertRaises(DuplicateJobRun): s.run(**kw)
 def test_medium_not_auto(self): self.assertEqual(autonomous_level('internal_decision_recompute',5,99,'low_risk_auto')[0],'human_approval_required')
 def test_public_never_auto(self): self.assertEqual(autonomous_level('cta_public_write',10,100,'low_risk_auto')[0],'human_approval_required')
 def test_human_queue(self):
  s=self.st(); r=s.run(job_key='p',scheduled_for='t',action_key='public_content_write',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=99,rule_version_id=RUL); self.assertEqual(r['status'],'queued_for_human'); self.assertEqual(len(s.human_queue),1)
 def test_circuit_breaker_opens(self):
  c=CircuitBreaker(3); c.record(False); c.record(False); self.assertEqual(c.state,'closed'); c.record(False); self.assertEqual(c.state,'open')
 def test_open_circuit_blocks(self):
  s=self.st(); s.circuit.state='open'
  with self.assertRaises(CircuitOpen): s.run(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL)
 def test_health_paused(self): self.assertEqual(SchedulerState().health()['status'],'paused')
 def test_health_healthy(self): self.assertEqual(self.st().health()['status'],'healthy')
 def test_rate_limit(self):
  s=self.st(); s.window_counts['w']=10
  with self.assertRaises(RateLimitExceeded): s.run(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL,window_key='w')
 def test_alert_cap(self):
  s=self.st();
  for i in range(20): self.assertIsNotNone(s.alert(str(i),'warning',{}))
  self.assertIsNone(s.alert('21','warning',{}))
 def test_inbox_priority(self):
  items=[{'queue_id':'b','priority':50,'status':'pending'},{'queue_id':'a','priority':100,'status':'pending'}]; self.assertEqual(prioritized_inbox(items)[0]['queue_id'],'a')
 def test_why_trace(self):
  r=self.st().run(job_key='x',scheduled_for='t',action_key='internal_health_check',requested_level='low_risk_auto',evidence_refs=['a','b'],confidence_score=90,rule_version_id=RUL); w=why(r); self.assertEqual(w['confidence_score'],90); self.assertFalse(w['public_write_authorized'])
 def test_dashboard_public_disabled(self):
  s=self.st(); h=build_dashboard_v2({'health':s.health(),'human_queue':[],'actions':[]}); self.assertIn('autonomia pública: DESACTIVADA',h)
 def test_observe_when_recommend_threshold_missed(self): self.assertEqual(autonomous_level('internal_health_check',0,20,'recommend')[0],'observe_only')
 def test_paused_requested(self): self.assertEqual(autonomous_level('internal_health_check',9,99,'paused')[0],'paused')

if __name__=='__main__': unittest.main()
