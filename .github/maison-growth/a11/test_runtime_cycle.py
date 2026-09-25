#!/usr/bin/env python3
from __future__ import annotations

import unittest

from runtime_cycle import POLICY, build_append_payload, canonical_rule_id, run_content_learning_cycle


def event(event_id: str, snapshot_count: int, click_rate: int=700):
    return {
        "event_id":event_id,
        "payload_hash":"a"*64,
        "occurred_at":"2026-09-26T00:00:00.000Z",
        "source":"maison-content-distribution",
        "event_type":"content.performance_observed",
        "privacy_class":"aggregated",
        "independent_snapshot_count":snapshot_count,
        "metadata":{
            "content_id":"cnt-piece-001",
            "channel":"instagram_reels",
            "click_rate_bps":click_rate,
            "source_refs_hash":"b"*64,
        },
    }


class FakeControl:
    def __init__(self,events):
        self.events=list(events)
        self.history={}
        self.calls=0

    def content_performance(self,*,limit=100,after=None,after_id=None):
        self.calls+=1
        if self.calls>1:
            return {"rows":[]}
        return {"rows":self.events,"next_cursor":None}

    def learning_subject(self,*,subject_id,limit=1):
        row=self.history.get(subject_id)
        return {"rows":[row] if row else []}


class FakeWriter:
    def __init__(self,control):
        self.control=control
        self.payloads=[]

    def append_content_learning(self,payload):
        self.payloads.append(payload)
        rec=payload["record"]
        self.control.history[rec["subject_id"]]={
            "confidence_after":rec["confidence_after"]
        }
        return {"status":"accepted","learning_record_id":rec["learning_record_id"],"duplicate":False}


class RuntimeCycleTests(unittest.TestCase):
    def test_policy_has_explicit_a112_baseline(self):
        self.assertEqual(POLICY["policy_version"],"A11.2")
        self.assertEqual(POLICY["initial_confidence"],50)
        self.assertTrue(canonical_rule_id().startswith("rul_"))
        self.assertEqual(len(canonical_rule_id()),40)

    def test_content_cycle_uses_baseline_then_persisted_confidence(self):
        control=FakeControl([
            event("evt_"+"1"*36,1),
            event("evt_"+"2"*36,3),
        ])
        writer=FakeWriter(control)
        out=run_content_learning_cycle(control,writer,page_size=10,max_pages=2)
        self.assertEqual(out["accepted"],2)
        self.assertEqual(len(writer.payloads),2)
        self.assertEqual(writer.payloads[0]["record"]["confidence_before"],50)
        self.assertEqual(writer.payloads[0]["record"]["confidence_after"],50)
        self.assertEqual(writer.payloads[1]["record"]["confidence_before"],50)
        self.assertEqual(writer.payloads[1]["record"]["confidence_after"],50)
        self.assertIn("INSUFFICIENT_ECONOMIC_DATA",writer.payloads[1]["record"]["reason_codes"])

    def test_append_payload_keeps_content_economics_null_without_a3(self):
        payload=build_append_payload(event("evt_"+"3"*36,3),50)
        rec=payload["record"]
        self.assertIsNone(rec["economic_value_minor"])
        self.assertEqual(rec["confidence_delta"],0)
        self.assertTrue(rec["source_id"].startswith("cnt_"))
        self.assertTrue(rec["subject_id"].startswith("can_"))
        self.assertIn("a1:event:"+"evt_"+"3"*36,rec["evidence_refs"])

if __name__=="__main__":
    unittest.main(verbosity=2)
