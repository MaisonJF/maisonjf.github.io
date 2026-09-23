#!/usr/bin/env python3
from __future__ import annotations

import unittest

from a14_projection import preview_to_dict, project_packet_to_a14
from commercial_cycle import run_commercial_cycle
from orchestrator import run_brain_cycle


class FakeControl:
    def __init__(self, payloads):
        self.payloads = list(payloads)

    def action_inbox(self, *, limit=50):
        if not self.payloads:
            raise AssertionError("unexpected_action_inbox_call")
        return self.payloads.pop(0)


class FakeProposal:
    def __init__(self):
        self.payloads = []

    def materialize(self, payload):
        self.payloads.append(dict(payload))
        return {
            "status": "ok",
            "opportunity_id": payload["opportunity"]["opportunity_id"],
            "queued_for_human": payload["queue_for_human"],
        }


class GoldenCommercialPathTests(unittest.TestCase):
    def test_canonical_evidence_reaches_human_inbox_without_execution_authority(self):
        need_id = "ned_" + "1" * 36
        solution_id = "sol_" + "2" * 36
        rows = [
            {
                "observation_id": "obs_pause_a",
                "territory_key": "home_pause",
                "source_class": "public_web",
                "response_excerpt": "pessoas procuram pequenos rituais de pausa em casa com aroma e luz",
                "observed_at": "2026-09-23T18:00:00Z",
                "confidence": 0.90,
                "independent_roots": ["https://source-a.example/report"],
                "evidence_refs": ["evd_pause_a"],
                "provider_id": "public_sensor_a",
                "model_id": None,
                "grounding_state": "grounded",
                "need_id": need_id,
                "intent_id": None,
                "semantic_ambiguity": 0,
            },
            {
                "observation_id": "obs_pause_b",
                "territory_key": "home_pause",
                "source_class": "public_web",
                "response_excerpt": "rituais simples de pausa em casa usam frequentemente aroma luz e ambiente",
                "observed_at": "2026-09-23T19:00:00Z",
                "confidence": 0.86,
                "independent_roots": ["https://source-b.example/report"],
                "evidence_refs": ["evd_pause_b"],
                "provider_id": "public_sensor_b",
                "model_id": None,
                "grounding_state": "grounded",
                "need_id": need_id,
                "intent_id": None,
                "semantic_ambiguity": 0,
            },
        ]

        packets = run_brain_cycle(
            rows=rows,
            similarity_threshold=0.35,
            minimum_independent_roots=2,
            scout_minimum_confidence=0.60,
            existing_solutions_by_territory={"home_pause": (solution_id,)},
            knowledge_context_by_territory={
                "home_pause": (
                    "ocean:casa:pausa",
                    "asset:catalog:product:vela-vidro",
                )
            },
            candidate_offer_types_by_territory={
                "home_pause": ("physical_product",)
            },
            economics_by_territory={"home_pause": {}},
            validation_modes={"physical_product": "manual_pilot"},
            operational_constraints_by_territory={
                "home_pause": {
                    "stock": "human_verified_before_execution",
                    "delivery_feasibility": "manual_review",
                }
            },
        )

        self.assertEqual(len(packets), 1)
        packet = packets[0]
        self.assertTrue(packet.a14_ready)
        self.assertEqual(packet.scout.need_id, need_id)
        self.assertEqual(
            set(packet.scout.independent_roots),
            {
                "https://source-a.example/report",
                "https://source-b.example/report",
            },
        )
        self.assertIn(
            "asset:catalog:product:vela-vidro",
            packet.scout.knowledge_context_refs,
        )

        policy = {
            "home_pause": {
                "opportunity_metrics": {
                    "demand": {
                        "value": 82,
                        "status": "INFERRED",
                        "confidence": 0.78,
                        "evidence_refs": "scout",
                    }
                },
                "existing_solution_by_offer": {
                    "physical_product": solution_id,
                },
            }
        }
        preview = project_packet_to_a14(
            packet,
            policy_by_territory=policy,
        )
        self.assertEqual(preview.state, "human_review_preview")
        self.assertEqual(preview.opportunity["need_id"], need_id)
        self.assertEqual(
            set(preview.opportunity["evidence_refs"]),
            {"evd_pause_a", "evd_pause_b"},
        )
        self.assertEqual(
            preview.offer_hypotheses[0]["existing_solution_id"],
            solution_id,
        )
        self.assertFalse(preview.a12_review_payloads[0]["outbound_authorized"])
        self.assertFalse(preview.a12_review_payloads[0]["spend_authorized"])
        self.assertFalse(preview.a12_review_payloads[0]["public_write_authorized"])

        observe_output = {
            "feed_rows": len(rows),
            "packets": [{"a14_ready": packet.a14_ready}],
            "a14_previews": [preview_to_dict(preview)],
        }
        control = FakeControl(
            [
                {"decide": [], "manual_pilots": [], "a8_drafts": []},
                {
                    "decide": [
                        {
                            "queue_id": "queue_golden_1",
                            "priority": "high",
                            "territory_code": "home_pause",
                            "offer_type": "physical_product",
                            "existing_solution_id": solution_id,
                            "opportunity_score": 82,
                            "opportunity_confidence": 0.78,
                            "validation_mode": "manual_pilot",
                        }
                    ],
                    "manual_pilots": [],
                    "a8_drafts": [],
                    "authority": {
                        "public_write_authorized": False,
                        "outbound_authorized": False,
                        "spend_authorized": False,
                        "experiment_execution_authorized": False,
                    },
                },
            ]
        )
        proposal = FakeProposal()

        report = run_commercial_cycle(
            control=control,
            observe_output=observe_output,
            enabled=True,
            allowed_states={"human_review_preview"},
            proposal=proposal,
        )

        self.assertEqual(len(proposal.payloads), 1)
        self.assertTrue(proposal.payloads[0]["queue_for_human"])
        self.assertTrue(report["writes_performed"])
        self.assertEqual(
            report["write_scope"],
            "a14_hypotheses_and_a12_queue_only",
        )
        self.assertEqual(report["inbox_after"]["counts"]["decide"], 1)
        self.assertFalse(report["authority"]["public_write_authorized"])
        self.assertFalse(report["authority"]["outbound_authorized"])
        self.assertFalse(report["authority"]["spend_authorized"])
        self.assertFalse(report["authority"]["experiment_execution_authorized"])
        self.assertFalse(report["authority"]["human_decision_automated"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
