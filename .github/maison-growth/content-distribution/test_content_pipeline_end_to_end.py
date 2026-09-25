#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
A2 = HERE.parent / "a2"
sys.path.insert(0, str(A2))

from collector import normalize_ingestion, to_a1_event
from authoring import approve_for_manual_distribution, build_authoring_packet, build_review_package
from distribution import build_distribution_packet, build_feedback_observation
from operating_system import build_campaign
from planner import build_brief, build_performance_feedback


class ContentPipelineEndToEndTests(unittest.TestCase):
    def test_signal_to_a1_event_without_public_side_effects(self):
        signal = {
            "source_refs": ["a7:decision:123", "a14:opportunity:456"],
            "axis": "cabeca",
            "intent": "recognition",
            "human_tension": "Chegas ao fim do dia e a conversa continua dentro da tua cabeça.",
            "desire": "Queres que o dia acabe também por dentro.",
            "audience_moment": "Fim do dia, a chegar a casa.",
        }

        brief = build_brief(signal)
        self.assertFalse(brief["distribution"]["automatic_publication"])

        campaign = build_campaign(brief, include_commercial_bridge=False)
        piece = campaign["pieces"][0]
        self.assertEqual(piece["role"], "recognise")
        self.assertTrue(piece["human_editorial_review_required"])

        authoring = build_authoring_packet(piece, {
            "human_tension": signal["human_tension"],
            "desire": signal["desire"],
            "audience_moment": signal["audience_moment"],
            "cta_kind": "save",
        })
        self.assertEqual(authoring["state"], "awaiting_draft")

        review = build_review_package(authoring, {
            "hook": "O dia acabou. A conversa na tua cabeça é que não.",
            "spoken_body": "Há coisas que continuam a pedir energia mesmo quando já não há nada para resolver hoje. Talvez o próximo passo seja deixar amanhã chegar.",
            "caption": "Nem tudo o que continua na cabeça precisa de resposta esta noite.",
            "cta_text": "Guarda para quando precisares de fechar o dia.",
        }, {
            "subject": "uma pessoa a chegar a casa",
            "setting": "entrada de casa ao fim do dia",
            "mood": "silêncio e alívio contido",
        })
        self.assertEqual(review["status"], "needs_human_review")

        approved = approve_for_manual_distribution(
            review,
            human_review_ref="a12:review:e2e-001",
            approval_scope="content_and_cta",
        )
        self.assertEqual(approved["status"], "approved_for_manual_distribution")
        self.assertFalse(approved["distribution"]["automatic_publication"])

        packet = build_distribution_packet(
            approved,
            channel="instagram_reels",
            planned_date="2026-09-28",
        )
        self.assertEqual(packet["platform"], "instagram")
        self.assertEqual(packet["surface"], "reels")
        self.assertFalse(packet["manual_execution"]["external_api_call"])
        self.assertFalse(packet["manual_execution"]["automatic_publication"])

        observation = build_feedback_observation(
            packet,
            observed_at="2026-09-29T12:00:00Z",
            window_start="2026-09-28T12:00:00Z",
            window_end="2026-09-29T12:00:00Z",
            source_refs=signal["source_refs"],
            metrics={
                "reach": 1200,
                "video_starts": 900,
                "completions": 450,
                "saves": 84,
                "shares": 36,
            },
        )

        feedback = build_performance_feedback(observation)
        raw = feedback["ingestion"]
        self.assertEqual(raw["event_type"], "content.performance_observed")
        self.assertEqual(raw["privacy_class"], "aggregated")
        self.assertEqual(raw["metadata"]["channel"], "instagram_reels")
        self.assertEqual(raw["metadata"]["completion_rate_bps"], 5000)
        self.assertEqual(raw["metadata"]["save_rate_bps"], 700)
        self.assertNotIn("winner", raw["metadata"])
        self.assertNotIn("economic_value", raw["metadata"])

        normalized = normalize_ingestion(raw)
        event = to_a1_event(normalized)
        self.assertEqual(event["schema_version"], 2)
        self.assertEqual(event["source"], "maison-content-distribution")
        self.assertEqual(event["event_type"], "content.performance_observed")
        meta = json.loads(event["metadata_json"])
        self.assertEqual(meta["platform"], "instagram")
        self.assertEqual(meta["surface"], "reels")
        self.assertTrue(meta["manual_distribution_confirmed"])


if __name__ == "__main__":
    unittest.main()
