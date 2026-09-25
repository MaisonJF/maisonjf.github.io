#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
A2 = HERE.parent / "a2"
sys.path.insert(0, str(A2))

from collector import normalize_ingestion, to_a1_event
from planner import (
    ContentContractError,
    PrivacyViolation,
    build_brief,
    build_manual_calendar,
    build_performance_feedback,
    validate_public_copy,
)


class ContentDistributionTests(unittest.TestCase):
    def sample_signal(self):
        return {
            "source_refs": ["a7:decision:123", "a14:opportunity:456"],
            "opportunity_ref": "a14:opportunity:456",
            "axis": "cabeca",
            "intent": "recognition",
            "human_tension": "Continuas a pensar no assunto mesmo quando ja sabes que nao vais resolver nada hoje.",
            "desire": "Queres silencio suficiente para voltar a ouvir-te.",
            "audience_moment": "Fim do dia, telemovel na mao, cabeca ainda no problema.",
        }

    def test_brief_is_derived_human_gated_and_non_publishing(self):
        brief = build_brief(self.sample_signal())
        self.assertEqual(brief["primary"]["format"], "short_video")
        self.assertEqual(brief["state"], "needs_editorial_review")
        self.assertTrue(brief["review"]["human_editorial_review_required"])
        self.assertFalse(brief["distribution"]["automatic_publication"])
        self.assertFalse(brief["distribution"]["automatic_scheduling"])
        self.assertFalse(brief["distribution"]["outbound_authorized"])
        self.assertGreaterEqual(len(brief["reuse_plan"]), 2)
        self.assertEqual(brief["learning"]["feedback_event_type"], "content.performance_observed")

    def test_commercial_without_existing_destination_does_not_invent_offer(self):
        signal = self.sample_signal()
        signal["intent"] = "commercial"
        brief = build_brief(signal)
        self.assertNotEqual(brief["cta"]["kind"], "visit_existing_destination")
        self.assertFalse(brief["cta"]["may_create_new_offer"])

        approved = build_brief(signal, approved_destination_ref="commercial-asset:service:tarot")
        self.assertEqual(approved["cta"]["kind"], "visit_existing_destination")
        self.assertEqual(approved["cta"]["approved_destination_ref"], "commercial-asset:service:tarot")

    def test_public_copy_rejects_long_dash_and_internal_engine_language(self):
        lint = validate_public_copy({
            "hook": "Isto parece simples — mas o A14 ja decidiu.",
            "body": "Uma frase humana.",
        })
        self.assertIn("hook:public_voice_dash_forbidden", lint["errors"])
        self.assertIn("hook:internal_engine_language_forbidden", lint["errors"])

    def test_public_copy_only_warns_on_aiish_cliche(self):
        lint = validate_public_copy({"body": "Em suma, isto fecha a questao."})
        self.assertFalse(lint["errors"])
        self.assertIn("body:generic_ai_or_manual_tone", lint["warnings"])

    def test_privacy_scan_blocks_direct_pii(self):
        signal = self.sample_signal()
        signal["human_tension"] = "Escreve para pessoa@example.com"
        with self.assertRaises(PrivacyViolation):
            build_brief(signal)

    def test_calendar_requires_human_approval_and_never_auto_publishes(self):
        with self.assertRaises(ContentContractError):
            build_manual_calendar(
                [{"content_id": "cnt_1", "format": "short_video", "state": "needs_editorial_review"}],
                [{"date": "2026-09-28", "channel": "instagram_reels"}],
            )

        plan = build_manual_calendar(
            [{
                "content_id": "cnt_1",
                "format": "short_video",
                "state": "approved_for_manual_distribution",
                "human_review_ref": "a12:review:abc",
            }],
            [{"date": "2026-09-28", "channel": "instagram_reels"}],
        )
        self.assertEqual(plan[0]["execution"], "manual_only")
        self.assertFalse(plan[0]["automatic_publication"])

    def observation(self):
        return {
            "content_id": "cnt_abc",
            "campaign_id": "cmp_abc",
            "thesis_id": "ths_abc",
            "comparison_id": "cpr_abc",
            "comparison_dimension": "hook_family",
            "variant_key": "var_abc",
            "platform": "instagram_reels",
            "format": "short_video",
            "intent": "recognition",
            "observed_at": "2026-09-25T12:00:00Z",
            "window_start": "2026-09-24T12:00:00Z",
            "window_end": "2026-09-25T12:00:00Z",
            "human_review_ref": "a12:review:abc",
            "source_refs": ["a7:decision:123"],
            "manual_distribution_confirmed": True,
            "metrics": {
                "reach": 1000,
                "video_starts": 800,
                "completions": 320,
                "shares": 50,
                "saves": 70,
                "link_clicks": 20,
                "conversions": 2,
            },
        }

    def test_feedback_is_accepted_by_canonical_a2_and_becomes_a1_v2(self):
        one = build_performance_feedback(self.observation())
        two = build_performance_feedback(self.observation())
        self.assertEqual(one["ingestion"], two["ingestion"])

        raw = one["ingestion"]
        self.assertEqual(raw["contract_version"], 1)
        self.assertEqual(raw["source"], "maison-content-distribution")
        self.assertEqual(raw["event_type"], "content.performance_observed")
        self.assertEqual(raw["privacy_class"], "aggregated")
        self.assertEqual(raw["metadata"]["completion_rate_bps"], 4000)
        self.assertEqual(raw["metadata"]["campaign_id"], "cmp_abc")
        self.assertEqual(raw["metadata"]["comparison_dimension"], "hook_family")
        self.assertEqual(raw["metadata"]["variant_key"], "var_abc")
        self.assertNotIn("combined_score", raw["metadata"])
        self.assertNotIn("winner", raw["metadata"])

        normalized = normalize_ingestion(raw)
        event = to_a1_event(normalized)
        self.assertEqual(event["event_type"], "content.performance_observed")
        self.assertEqual(event["schema_version"], 2)
        self.assertEqual(event["privacy_class"], "aggregated")
        self.assertTrue(event["event_id"].startswith("evt_"))
        metadata = json.loads(event["metadata_json"])
        self.assertEqual(metadata["save_rate_bps"], 700)
        self.assertTrue(metadata["manual_distribution_confirmed"])
        self.assertFalse(one["learning_context"]["economic_value_inferred"])

    def test_unknown_denominator_does_not_become_zero_rate(self):
        observation = self.observation()
        observation["platform"] = "instagram_feed"
        observation["format"] = "carousel_post"
        observation["intent"] = "education"
        observation["metrics"] = {"saves": 10}
        result = build_performance_feedback(observation)
        self.assertNotIn("save_rate_bps", result["ingestion"]["metadata"])

    def test_feedback_requires_integer_platform_metrics(self):
        observation = self.observation()
        observation["metrics"] = {"reach": 10.5}
        with self.assertRaises(ContentContractError):
            build_performance_feedback(observation)

    def test_feedback_rejects_unknown_comparison_dimension(self):
        observation = self.observation()
        observation["comparison_dimension"] = "caption_colour"
        with self.assertRaisesRegex(ContentContractError, "unsupported_comparison_dimension"):
            build_performance_feedback(observation)

    def test_feedback_requires_dimension_when_comparison_id_exists(self):
        observation = self.observation()
        observation.pop("comparison_dimension")
        with self.assertRaisesRegex(ContentContractError, "comparison_dimension_required"):
            build_performance_feedback(observation)


if __name__ == "__main__":
    unittest.main()
