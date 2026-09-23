#!/usr/bin/env python3
from __future__ import annotations

import unittest

from plan_approved_validations import build_plan_payload


class ApprovedValidationPlanningTests(unittest.TestCase):
    def test_b2b_review_builds_manual_plan_with_timestamp(self):
        row={
            "review_resolution_id":"rvr_"+"1"*36,
            "opportunity_id":"opp_"+"2"*36,
            "offer_hypothesis_id":"ofh_"+"3"*36,
            "decision":"approved",
            "approved_scope":"experiment_planning_only",
            "territory_code":"gifting",
            "offer_type":"corporate_gifting",
            "validation_mode":"b2b_pilot",
            "existing_solution_id":None,
            "evidence_refs":["evd_x"],
            "reason_codes":["approved"],
        }
        plan=build_plan_payload(row)
        self.assertEqual(plan["plan_kind"],"manual_b2b_pilot")
        self.assertEqual(plan["state"],"manual_pilot_required")
        self.assertTrue(plan["created_at"].endswith("Z"))
        self.assertFalse(plan["experiment_execution_authorized"])

    def test_cta_review_stays_blocked_until_a7_exists(self):
        row={
            "review_resolution_id":"rvr_"+"1"*36,
            "opportunity_id":"opp_"+"2"*36,
            "offer_hypothesis_id":"ofh_"+"3"*36,
            "decision":"approved",
            "approved_scope":"experiment_planning_only",
            "territory_code":"relationships",
            "offer_type":"service",
            "validation_mode":"cta_test",
            "existing_solution_id":"sol_"+"4"*36,
            "evidence_refs":["evd_x"],
            "reason_codes":["approved"],
        }
        plan=build_plan_payload(row)
        self.assertEqual(plan["plan_kind"],"a8_cta_existing_solution")
        self.assertEqual(plan["state"],"blocked_needs_a7_decision")
        self.assertIsNone(plan["a7_decision_id"])
        self.assertIsNone(plan["a8_experiment_id"])


if __name__=="__main__":
    unittest.main(verbosity=2)
