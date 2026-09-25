#!/usr/bin/env python3
import unittest

from authoring import approve_for_manual_distribution, build_authoring_packet, build_review_package
from distribution import build_distribution_packet, build_feedback_observation
from operating_system import build_comparison_plan
from planner import ContentContractError, build_performance_feedback


class ContentDistributionPacketTests(unittest.TestCase):
    def approved(self, *, content_id="cnt_a"):
        piece = {
            "content_id": content_id,
            "campaign_id": "cmp_a",
            "thesis_id": "ths_a",
            "role": "recognise",
            "format": "short_video",
            "intent": "recognition",
        }
        context = {
            "human_tension": "O dia acabou mas a conversa continua na tua cabeça.",
            "desire": "Queres silêncio.",
            "audience_moment": "Fim do dia.",
            "cta_kind": "save",
        }
        packet = build_authoring_packet(piece, context)
        review = build_review_package(packet, {
            "hook": "O dia acabou. A conversa na tua cabeça é que não.",
            "spoken_body": "Nem tudo o que continua a pedir atenção precisa de resposta esta noite.",
            "caption": "Talvez amanhã chegue melhor se hoje acabar mesmo.",
            "cta_text": "Guarda para quando precisares de fechar o dia.",
        }, {
            "subject": "pessoa a chegar a casa",
            "setting": "entrada de casa ao fim do dia",
            "mood": "quieto e contido",
        })
        return approve_for_manual_distribution(
            review,
            human_review_ref="a12:review:content-123",
            approval_scope="content_and_cta",
        )

    def test_distribution_packet_is_manual_only_and_channel_normalized(self):
        packet = build_distribution_packet(
            self.approved(),
            channel="instagram_reels",
            planned_date="2026-09-28",
        )
        self.assertEqual(packet["platform"], "instagram")
        self.assertEqual(packet["surface"], "reels")
        self.assertTrue(packet["manual_execution"]["required"])
        self.assertFalse(packet["manual_execution"]["external_api_call"])
        self.assertFalse(packet["manual_execution"]["automatic_publication"])

    def test_distribution_rejects_wrong_channel_for_format(self):
        with self.assertRaises(ContentContractError):
            build_distribution_packet(
                self.approved(),
                channel="instagram_feed",
                planned_date="2026-09-28",
            )

    def comparison(self):
        variants = [
            {
                "campaign_id": "cmp_a",
                "thesis_id": "ths_a",
                "content_id": "cnt_a",
                "channel": "instagram_reels",
                "format": "short_video",
                "hook_family": "recognition",
                "cta_kind": "save",
                "approved_destination_ref": "",
            },
            {
                "campaign_id": "cmp_a",
                "thesis_id": "ths_a",
                "content_id": "cnt_b",
                "channel": "instagram_reels",
                "format": "short_video",
                "hook_family": "specific_moment",
                "cta_kind": "save",
                "approved_destination_ref": "",
            },
        ]
        return build_comparison_plan(
            variants,
            dimension="hook_family",
            primary_metric="completion_rate_bps",
        )

    def test_comparison_lineage_flows_into_distribution_and_feedback(self):
        comparison = self.comparison()
        dist = build_distribution_packet(
            self.approved(content_id="cnt_a"),
            channel="instagram_reels",
            planned_date="2026-09-28",
            comparison=comparison,
        )
        self.assertEqual(dist["comparison_id"], comparison["comparison_id"])
        self.assertEqual(dist["comparison_dimension"], "hook_family")
        self.assertTrue(dist["variant_key"])

        observation = build_feedback_observation(
            dist,
            observed_at="2026-09-29T12:00:00Z",
            window_start="2026-09-28T12:00:00Z",
            window_end="2026-09-29T12:00:00Z",
            source_refs=["a7:decision:123"],
            metrics={"reach": 1000, "video_starts": 700, "completions": 350},
        )
        feedback = build_performance_feedback(observation)
        meta = feedback["ingestion"]["metadata"]
        self.assertEqual(meta["channel"], "instagram_reels")
        self.assertEqual(meta["platform"], "instagram")
        self.assertEqual(meta["surface"], "reels")
        self.assertEqual(meta["comparison_id"], comparison["comparison_id"])
        self.assertEqual(meta["completion_rate_bps"], 5000)


if __name__ == "__main__":
    unittest.main()
