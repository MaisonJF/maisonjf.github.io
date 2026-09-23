#!/usr/bin/env python3
from __future__ import annotations

import unittest

from validation_planner import plan_review_row


def row(**overrides):
    base={
        "queue_id":"inq_"+"1"*36,
        "status":"approved",
        "opportunity_id":"opp_"+"2"*36,
        "offer_hypothesis_id":"ofh_"+"3"*36,
        "offer_type":"service",
        "validation_mode":"manual",
        "existing_solution_id":None,
    }
    base.update(overrides)
    return base


class ValidationPlannerTests(unittest.TestCase):
    def assert_no_execution_authority(self, plan):
        self.assertFalse(plan.public_write_authorized)
        self.assertFalse(plan.outbound_authorized)
        self.assertFalse(plan.spend_authorized)
        self.assertFalse(plan.experiment_execution_authorized)

    def test_unapproved_never_plans(self):
        plan=plan_review_row(row(status="pending"))
        self.assertEqual(plan.state,"not_approved")
        self.assertEqual(plan.route,"none")
        self.assert_no_execution_authority(plan)

    def test_a8_only_for_explicit_existing_solution_cta_mode(self):
        plan=plan_review_row(row(
            offer_type="service",
            validation_mode="cta_route_existing_solution",
            existing_solution_id="sol_"+"4"*36,
        ))
        self.assertTrue(plan.a8_candidate)
        self.assertEqual(plan.route,"a8_cta_existing_solution")
        self.assertIn("a7_test_cta_decision_required",plan.blockers)
        self.assertIn("source_asset_snapshot_required",plan.blockers)
        self.assert_no_execution_authority(plan)

    def test_existing_solution_without_explicit_cta_mode_is_not_forced_into_a8(self):
        plan=plan_review_row(row(
            offer_type="service",
            validation_mode="manual",
            existing_solution_id="sol_"+"4"*36,
        ))
        self.assertFalse(plan.a8_candidate)
        self.assertEqual(plan.route,"human_service_pilot")

    def test_b2b_routes_to_human_pilot(self):
        plan=plan_review_row(row(
            offer_type="corporate_gifting",
            validation_mode="b2b_pilot",
        ))
        self.assertEqual(plan.route,"human_b2b_pilot")
        self.assertFalse(plan.a8_candidate)
        self.assertIn("outbound_remains_human_authorized_only",plan.blockers)
        self.assert_no_execution_authority(plan)

    def test_physical_routes_to_micro_batch_or_preorder(self):
        plan=plan_review_row(row(offer_type="physical_product"))
        self.assertEqual(plan.route,"physical_micro_batch_or_preorder")
        self.assertIn("unit_cost",plan.required_human_inputs)
        self.assert_no_execution_authority(plan)

    def test_service_routes_to_human_service_pilot(self):
        plan=plan_review_row(row(offer_type="workshop"))
        self.assertEqual(plan.route,"human_service_pilot")
        self.assertIn("capacity",plan.required_human_inputs)

    def test_digital_route_remains_manual_until_a8_supports_it(self):
        plan=plan_review_row(row(offer_type="ebook"))
        self.assertEqual(plan.route,"manual_digital_validation")
        self.assertFalse(plan.a8_candidate)


if __name__=="__main__":
    unittest.main(verbosity=2)
