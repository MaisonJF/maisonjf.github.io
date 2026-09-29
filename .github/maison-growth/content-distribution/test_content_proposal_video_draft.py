from __future__ import annotations

import unittest

from proposal_video_draft import (
    build_generation_recipe,
    build_manifest,
    select_content_proposal,
    validate_proposal,
)


def proposal(**overrides):
    base = {
        "contract_version": "BRAIN-CONTENT-PROPOSAL-1.0",
        "proposal_id": "cntp_demo",
        "state": "ready_for_editorial_review",
        "source": {
            "ocean_key": "micro-luxo-como-recompensa-e-ritual",
            "priority": 91,
            "priority_band": "today",
            "alert_kind": "commercial_opportunity",
        },
        "editorial_decision": {
            "worth_attention_today": True,
            "priority_band": "today",
            "format": "short_video",
            "channels": ["instagram_reels", "tiktok", "youtube_shorts"],
            "axis": "corpo",
            "intent": "commercial",
        },
        "draft": {
            "hook": "Nem todo o luxo precisa de mudar a tua vida.",
            "spoken_body": "Às vezes basta mudar uma terça-feira.",
            "caption": "Pequeno não quer dizer irrelevante.",
            "cta_text": "Vê em maison-jf.com",
            "on_screen_url": "maison-jf.com",
        },
        "visual_brief": {
            "subject": "produto Maison numa mesa elegante",
            "setting": "vertical 9:16",
        },
        "video_draft_plan": {
            "source_image_url": "https://maison-jf.com/images/maison-jf-corpo-homem-hq.jpg",
            "shots": [
                {
                    "duration_seconds": 2,
                    "image_url": "https://maison-jf.com/images/maison-jf-corpo-homem-hq.jpg",
                    "motion_prompt": "Subtle cinematic push-in, no generated text.",
                }
            ],
            "execution_gate": {
                "human_editorial_review_required": True,
                "automatic_generation": False,
                "automatic_publication": False,
                "spend_authorized": False,
            },
        },
        "destination": {
            "approved_existing_path": "/produtos/",
            "may_create_new_offer": False,
        },
        "gates": {
            "human_editorial_review_required": True,
            "automatic_publication": False,
            "automatic_scheduling": False,
            "paid_generation_authorized": False,
            "spend_authorized": False,
        },
    }
    base.update(overrides)
    return base


class ProposalVideoDraftTests(unittest.TestCase):
    def test_select_prefers_today_then_priority(self):
        low = proposal(
            proposal_id="cntp_low",
            source={"priority": 74},
            editorial_decision={"format": "short_video", "priority_band": "queue"},
        )
        high = proposal(proposal_id="cntp_high")
        selected = select_content_proposal({"content_proposals": [low, high]})
        self.assertEqual(selected["proposal_id"], "cntp_high")

    def test_validate_refuses_publication_authority(self):
        bad = proposal(gates={**proposal()["gates"], "automatic_publication": True})
        with self.assertRaises(Exception):
            validate_proposal(bad)

    def test_recipe_uses_existing_https_source_and_no_spend(self):
        item = proposal()
        recipe = build_generation_recipe(item)
        self.assertEqual(recipe["source_image_url"].startswith("https://"), True)
        self.assertEqual(recipe["persistent_url"], "maison-jf.com")
        manifest = build_manifest(item, recipe)
        self.assertEqual(manifest["gates"]["automatic_publication"], False)
        self.assertEqual(manifest["gates"]["automatic_scheduling"], False)
        self.assertEqual(manifest["gates"]["spend_authorized"], False)
        self.assertEqual(manifest["artifact"]["publication"], "not_published")

    def test_rows_payload_from_brain_feed_is_supported(self):
        selected = select_content_proposal({"rows": [{"content_proposal": proposal()}]})
        self.assertEqual(selected["proposal_id"], "cntp_demo")


if __name__ == "__main__":
    unittest.main()
