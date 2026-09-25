#!/usr/bin/env python3
import unittest

from operating_system import (
    build_campaign,
    build_campaign_calendar,
    build_comparison_plan,
    interpret_comparison,
)
from planner import ContentContractError, build_brief


class ContentOperatingSystemTests(unittest.TestCase):
    def source_brief(self, destination=None):
        signal = {
            "source_refs": ["a7:decision:123", "a14:opportunity:456"],
            "axis": "cabeca",
            "intent": "recognition",
            "human_tension": "Continuas a pensar no assunto mesmo quando ja nao ha nada para decidir hoje.",
            "desire": "Queres recuperar silencio.",
            "audience_moment": "Fim do dia.",
        }
        return build_brief(signal, approved_destination_ref=destination)

    def test_campaign_is_derived_and_never_publishes(self):
        campaign = build_campaign(self.source_brief("commercial-asset:service:tarot"))
        self.assertTrue(campaign["derived_only"])
        self.assertFalse(campaign["automatic_publication"])
        self.assertEqual(campaign["canonical_intelligence_owner"], "Maison Brain")
        self.assertEqual(len(campaign["pieces"]), 5)
        self.assertTrue(all(p["human_editorial_review_required"] for p in campaign["pieces"]))

    def test_commercial_bridge_downgrades_without_approved_destination(self):
        campaign = build_campaign(self.source_brief())
        commercial = [p for p in campaign["pieces"] if p["role"] == "commercial_bridge"][0]
        self.assertEqual(commercial["intent"], "movement")
        self.assertIsNone(commercial["approved_destination_ref"])

    def variants(self):
        return [
            {
                "campaign_id": "cmp_a",
                "thesis_id": "ths_a",
                "content_id": "cnt_a",
                "platform": "instagram_reels",
                "format": "short_video",
                "hook_family": "recognition",
                "cta_kind": "save",
                "approved_destination_ref": "",
            },
            {
                "campaign_id": "cmp_a",
                "thesis_id": "ths_a",
                "content_id": "cnt_b",
                "platform": "instagram_reels",
                "format": "short_video",
                "hook_family": "specific_moment",
                "cta_kind": "save",
                "approved_destination_ref": "",
            },
        ]

    def test_hook_comparison_changes_one_dimension_only(self):
        plan = build_comparison_plan(
            self.variants(),
            dimension="hook_family",
            primary_metric="completion_rate_bps",
        )
        self.assertEqual(plan["dimension"], "hook_family")
        self.assertFalse(plan["randomized"])
        self.assertFalse(plan["causal_claim"])
        self.assertFalse(plan["automatic_winner"])

    def test_comparison_rejects_multiple_changes(self):
        variants = self.variants()
        variants[1]["cta_kind"] = "share"
        with self.assertRaises(ContentContractError):
            build_comparison_plan(
                variants,
                dimension="hook_family",
                primary_metric="completion_rate_bps",
            )

    def test_commercial_destination_cta_comparison_belongs_to_a8(self):
        variants = self.variants()
        variants[0]["hook_family"] = variants[1]["hook_family"]
        variants[0]["cta_kind"] = "visit_existing_destination"
        variants[1]["cta_kind"] = "save"
        variants[0]["approved_destination_ref"] = "commercial-asset:a"
        variants[1]["approved_destination_ref"] = "commercial-asset:a"
        with self.assertRaisesRegex(ContentContractError, "belongs_to_A8"):
            build_comparison_plan(
                variants,
                dimension="cta_kind",
                primary_metric="click_rate_bps",
            )

    def test_campaign_calendar_requires_review_and_blocks_duplicates(self):
        campaign = build_campaign(self.source_brief(), include_commercial_bridge=False)
        p = campaign["pieces"][0]
        approved = {
            **p,
            "state": "approved_for_manual_distribution",
            "human_review_ref": "a12:review:123",
        }
        plan = build_campaign_calendar(
            campaign,
            [approved],
            [{"date": "2026-09-28", "channel": p["channels"][0]}],
        )
        self.assertEqual(plan[0]["execution"], "manual_only")
        self.assertFalse(plan[0]["automatic_scheduling"])

    def test_interpretation_is_directional_not_causal_or_automatic(self):
        comparison = build_comparison_plan(
            self.variants(),
            dimension="hook_family",
            primary_metric="completion_rate_bps",
        )
        result = interpret_comparison(comparison, [
            {"content_id": "cnt_a", "metrics": {"completion_rate_bps": 3000}},
            {"content_id": "cnt_a", "metrics": {"completion_rate_bps": 3200}},
            {"content_id": "cnt_b", "metrics": {"completion_rate_bps": 4100}},
            {"content_id": "cnt_b", "metrics": {"completion_rate_bps": 4300}},
        ])
        self.assertEqual(result["stronger_observed_variant"], "cnt_b")
        self.assertEqual(result["signal_kind"], "directional_observation")
        self.assertFalse(result["causal_claim"])
        self.assertFalse(result["automatic_winner"])
        self.assertFalse(result["automatic_promotion"])


if __name__ == "__main__":
    unittest.main()
