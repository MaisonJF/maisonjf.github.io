#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from plan_a8_drafts import CtaContextError, build_drafts, load_cta_context


PLAN_ID="vpl_"+"1"*36
SOL_CONTROL="sol_"+"2"*36
SOL_TREAT="sol_"+"3"*36
DECISION_ID="dec_"+"4"*36


class FakeControl:
    def __init__(self, *, include_context_plan=True):
        self.include_context_plan=include_context_plan

    def validation_plans(self, *, state, limit):
        self.state=state
        self.limit=limit
        return {"rows":[{
            "validation_plan_id":PLAN_ID,
            "plan_kind":"a8_cta_existing_solution",
            "existing_solution_id":SOL_TREAT,
            "hypothesis":"Routing this CTA to the approved existing solution may improve economic value safely.",
            "primary_metric_key":"economic_value_per_eligible_session",
            "evidence_refs":["evd_plan"],
        }]}

    def a7_test_cta_decisions(self, *, solution_id, limit):
        self.solution_id=solution_id
        return {"rows":[{
            "decision_id":DECISION_ID,
            "decision_type":"test_cta",
            "hard_gates_passed":True,
            "recommended_solution_id":SOL_TREAT,
            "rule_version_id":"rul_"+"5"*36,
            "model_version_id":None,
            "evidence_refs":["evd_a7"],
        }]}


def context():
    return {
        "validation_plan_id":PLAN_ID,
        "source_asset_id":"ast_"+"6"*36,
        "cta_slot_key":"primary",
        "control_solution_id":SOL_CONTROL,
        "treatment_solution_id":SOL_TREAT,
        "max_exposures":500,
        "evidence_refs":["manual:cta-map"],
    }


class PlanA8DraftTests(unittest.TestCase):
    def test_load_cta_context_requires_evidence_and_unique_plan(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/"context.json"
            path.write_text(json.dumps({
                "schema_version":"cta_experiment_context_v1",
                "observed_at":"2026-09-23T20:00:00Z",
                "contexts":[context()],
            }),encoding="utf-8")
            loaded=load_cta_context(path)
            self.assertIn(PLAN_ID,loaded)

    def test_unknown_context_field_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td)/"context.json"
            row={**context(),"mystery":True}
            path.write_text(json.dumps({
                "schema_version":"cta_experiment_context_v1",
                "observed_at":"2026-09-23T20:00:00Z",
                "contexts":[row],
            }),encoding="utf-8")
            with self.assertRaises(CtaContextError):
                load_cta_context(path)

    def test_build_drafts_uses_matching_a7_decision(self):
        fake=FakeControl()
        drafts,blocked=build_drafts(control=fake,contexts={PLAN_ID:context()},limit=20)
        self.assertEqual(blocked,[])
        self.assertEqual(len(drafts),1)
        self.assertEqual(drafts[0]["a7_decision_id"],DECISION_ID)
        self.assertEqual(fake.solution_id,SOL_TREAT)
        self.assertFalse(drafts[0]["experiment_execution_authorized"])

    def test_missing_private_context_blocks_without_guessing(self):
        drafts,blocked=build_drafts(control=FakeControl(),contexts={},limit=20)
        self.assertEqual(drafts,[])
        self.assertEqual(blocked[0]["reason"],"private_cta_context_missing")


if __name__=="__main__":
    unittest.main(verbosity=2)
