#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from commercial_cycle import run_commercial_cycle, select_payloads


class FakeControl:
    def __init__(self, payloads):
        self.payloads = list(payloads)
        self.calls = []

    def action_inbox(self, *, limit=50):
        self.calls.append(limit)
        if not self.payloads:
            raise AssertionError("unexpected_action_inbox_call")
        return self.payloads.pop(0)


class FakeProposal:
    def __init__(self):
        self.payloads = []

    def materialize(self, payload):
        self.payloads.append(dict(payload))
        return {"status": "ok", "materialized": True}


def preview_fixture():
    opportunity = {
        "opportunity_id": "opp_" + "1" * 36,
        "territory_code": "pt_porto",
    }
    offer = {
        "offer_hypothesis_id": "ofr_" + "2" * 36,
        "opportunity_id": opportunity["opportunity_id"],
        "offer_type": "service",
    }
    review = {
        "action_id": "act_" + "3" * 36,
        "opportunity_id": opportunity["opportunity_id"],
        "offer_hypothesis_id": offer["offer_hypothesis_id"],
    }
    return {
        "feed_rows": 4,
        "packets": [{"packet_id": "pkt_1"}],
        "a14_previews": [
            {
                "state": "human_review_preview",
                "opportunity": opportunity,
                "offer_hypotheses": [offer],
                "distribution_matches": [],
                "a12_review_payloads": [review],
            }
        ],
    }


class CommercialCycleTests(unittest.TestCase):
    def test_selects_only_allowed_materializable_previews(self):
        output = preview_fixture()
        opportunity = output["a14_previews"][0]["opportunity"]
        output["a14_previews"].extend(
            [
                {
                    "state": "rejected",
                    "opportunity": opportunity,
                    "offer_hypotheses": output["a14_previews"][0]["offer_hypotheses"],
                    "distribution_matches": [],
                    "a12_review_payloads": [],
                },
                {
                    "state": "enrichment_required",
                    "opportunity": opportunity,
                    "offer_hypotheses": [],
                    "distribution_matches": [],
                    "a12_review_payloads": [],
                },
            ]
        )
        selected = select_payloads(output, {"human_review_preview", "enrichment_required"})
        self.assertEqual(len(selected), 1)
        self.assertTrue(selected[0]["queue_for_human"])
        self.assertEqual(
            selected[0]["opportunity"]["opportunity_id"],
            opportunity["opportunity_id"],
        )

    def test_empty_or_invalid_preview_list_is_safe(self):
        self.assertEqual(select_payloads({}, {"human_review_preview"}), [])
        self.assertEqual(
            select_payloads({"a14_previews": "invalid"}, {"human_review_preview"}),
            [],
        )

    def test_preview_cycle_refreshes_inbox_without_writes_or_proposal_client(self):
        control = FakeControl(
            [
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
            ]
        )
        report = run_commercial_cycle(
            control=control,
            observe_output=preview_fixture(),
            enabled=False,
            allowed_states={"human_review_preview"},
        )

        self.assertEqual(control.calls, [50, 50])
        self.assertEqual(report["mode"], "preview_only")
        self.assertEqual(report["selected_previews"], 1)
        self.assertEqual(report["selected_for_human_review"], 1)
        self.assertFalse(report["writes_performed"])
        self.assertEqual(report["write_scope"], "none")
        self.assertEqual(report["proposal_responses"], [])
        self.assertEqual(report["inbox_before"]["counts"]["total"], 0)
        self.assertEqual(report["inbox_after"]["counts"]["total"], 0)
        self.assertFalse(any(report["authority"].values()))

    def test_materialization_cycle_writes_only_proposals_then_refreshes_human_inbox(self):
        control = FakeControl(
            [
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
                {
                    "decide": [
                        {
                            "queue_id": "queue_1",
                            "priority": "high",
                            "territory_code": "pt_porto",
                            "offer_type": "service",
                            "opportunity_score": 82,
                            "opportunity_confidence": 0.81,
                            "validation_mode": "manual_pilot",
                            "customer_email": "must-not-leak@example.test",
                        }
                    ],
                    "manual_pilots": [],
                    "a8_drafts": [],
                },
            ]
        )
        proposal = FakeProposal()
        report = run_commercial_cycle(
            control=control,
            observe_output=preview_fixture(),
            enabled=True,
            allowed_states={"human_review_preview"},
            proposal=proposal,
        )

        self.assertEqual(len(proposal.payloads), 1)
        self.assertTrue(proposal.payloads[0]["queue_for_human"])
        self.assertEqual(report["mode"], "materialize_to_human_inbox")
        self.assertTrue(report["writes_performed"])
        self.assertEqual(report["write_scope"], "a14_hypotheses_and_a12_queue_only")
        self.assertEqual(report["inbox_before"]["counts"]["total"], 0)
        self.assertEqual(report["inbox_after"]["counts"]["decide"], 1)
        self.assertNotIn("customer_email", json.dumps(report["inbox_after"]))
        self.assertFalse(report["authority"]["human_decision_automated"])
        self.assertFalse(report["authority"]["experiment_execution_authorized"])

    def test_enabled_cycle_with_selected_payload_requires_explicit_proposal_client(self):
        control = FakeControl(
            [{"decide": [], "manual_pilots": [], "a8_drafts": []}]
        )
        with self.assertRaisesRegex(
            RuntimeError, "proposal_client_required_when_materialization_enabled"
        ):
            run_commercial_cycle(
                control=control,
                observe_output=preview_fixture(),
                enabled=True,
                allowed_states={"human_review_preview"},
            )

    def test_enabled_cycle_with_no_selected_payload_does_not_require_proposal_client(self):
        control = FakeControl(
            [
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
            ]
        )
        report = run_commercial_cycle(
            control=control,
            observe_output={"feed_rows": 0, "packets": [], "a14_previews": []},
            enabled=True,
            allowed_states={"human_review_preview"},
        )
        self.assertFalse(report["writes_performed"])
        self.assertEqual(report["write_scope"], "none")


if __name__ == "__main__":
    unittest.main(verbosity=2)
