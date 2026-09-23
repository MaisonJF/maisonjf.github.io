#!/usr/bin/env python3
from __future__ import annotations

import unittest

from a8_draft_planner import A8DraftPlanningError, build_a8_draft


SOL_CONTROL="sol_"+"1"*36
SOL_TREAT="sol_"+"2"*36
PLAN={
    "validation_plan_id":"vpl_"+"3"*36,
    "plan_kind":"a8_cta_existing_solution",
    "existing_solution_id":SOL_TREAT,
    "hypothesis":"Routing this eligible CTA to the approved existing solution may improve observed economic value safely.",
    "primary_metric_key":"economic_value_per_eligible_session",
    "evidence_refs":["evd_plan"],
}
DECISION={
    "decision_id":"dec_"+"4"*36,
    "decision_type":"test_cta",
    "hard_gates_passed":True,
    "recommended_solution_id":SOL_TREAT,
    "rule_version_id":"rul_"+"5"*36,
    "model_version_id":None,
    "evidence_refs":["evd_a7"],
}
CONTEXT={
    "validation_plan_id":PLAN["validation_plan_id"],
    "source_asset_id":"ast_"+"6"*36,
    "cta_slot_key":"primary",
    "control_solution_id":SOL_CONTROL,
    "treatment_solution_id":SOL_TREAT,
    "max_exposures":500,
    "territory_key":"relationships",
    "evidence_refs":["manual:cta-map"],
}


class A8DraftPlannerTests(unittest.TestCase):
    def test_valid_draft_is_simulation_only(self):
        draft=build_a8_draft(PLAN,a7_decisions=[DECISION],cta_context=CONTEXT)
        self.assertEqual(draft["schema"],"maison.a8-draft.v1")
        self.assertEqual(draft["a7_decision_id"],DECISION["decision_id"])
        self.assertEqual(draft["state"]["to_state"],"draft")
        self.assertEqual(draft["state"]["actor_kind"],"system_simulation")
        self.assertFalse(draft["public_write_authorized"])
        self.assertFalse(draft["experiment_execution_authorized"])
        self.assertEqual(
            draft["variants"][0]["variant_payload"]["destination_solution_id"],
            SOL_CONTROL,
        )
        self.assertEqual(
            draft["variants"][1]["variant_payload"]["destination_solution_id"],
            SOL_TREAT,
        )
        self.assertEqual(sum(x["allocation_basis_points"] for x in draft["variants"]),10000)

    def test_multiple_a7_decisions_require_explicit_selection(self):
        other={**DECISION,"decision_id":"dec_"+"7"*36}
        with self.assertRaises(A8DraftPlanningError):
            build_a8_draft(PLAN,a7_decisions=[DECISION,other],cta_context=CONTEXT)
        chosen={**CONTEXT,"a7_decision_id":other["decision_id"]}
        draft=build_a8_draft(PLAN,a7_decisions=[DECISION,other],cta_context=chosen)
        self.assertEqual(draft["a7_decision_id"],other["decision_id"])

    def test_control_and_treatment_cannot_be_same(self):
        with self.assertRaises(A8DraftPlanningError):
            build_a8_draft(
                PLAN,
                a7_decisions=[DECISION],
                cta_context={**CONTEXT,"control_solution_id":SOL_TREAT},
            )

    def test_max_exposures_must_meet_policy_minimum(self):
        with self.assertRaises(A8DraftPlanningError):
            build_a8_draft(
                PLAN,
                a7_decisions=[DECISION],
                cta_context={**CONTEXT,"max_exposures":10},
            )

    def test_a7_solution_must_match_treatment(self):
        wrong={**DECISION,"recommended_solution_id":SOL_CONTROL}
        with self.assertRaises(A8DraftPlanningError):
            build_a8_draft(PLAN,a7_decisions=[wrong],cta_context=CONTEXT)


if __name__=="__main__":
    unittest.main(verbosity=2)
