#!/usr/bin/env python3
from __future__ import annotations

import unittest

from commercial_cycle import select_payloads


class CommercialCycleTests(unittest.TestCase):
    def test_selects_only_allowed_materializable_previews(self):
        base_opportunity = {
            "opportunity_id": "opp_" + "1" * 36,
            "territory_code": "pt_porto",
        }
        offer = {
            "offer_hypothesis_id": "ofr_" + "2" * 36,
            "opportunity_id": base_opportunity["opportunity_id"],
        }
        review = {
            "action_id": "act_" + "3" * 36,
            "opportunity_id": base_opportunity["opportunity_id"],
            "offer_hypothesis_id": offer["offer_hypothesis_id"],
        }
        output = {
            "a14_previews": [
                {
                    "state": "human_review_preview",
                    "opportunity": base_opportunity,
                    "offer_hypotheses": [offer],
                    "distribution_matches": [],
                    "a12_review_payloads": [review],
                },
                {
                    "state": "rejected",
                    "opportunity": base_opportunity,
                    "offer_hypotheses": [offer],
                    "distribution_matches": [],
                    "a12_review_payloads": [],
                },
                {
                    "state": "enrichment_required",
                    "opportunity": base_opportunity,
                    "offer_hypotheses": [],
                    "distribution_matches": [],
                    "a12_review_payloads": [],
                },
            ]
        }
        selected = select_payloads(output, {"human_review_preview", "enrichment_required"})
        self.assertEqual(len(selected), 1)
        self.assertTrue(selected[0]["queue_for_human"])
        self.assertEqual(selected[0]["opportunity"]["opportunity_id"], base_opportunity["opportunity_id"])

    def test_empty_or_invalid_preview_list_is_safe(self):
        self.assertEqual(select_payloads({}, {"human_review_preview"}), [])
        self.assertEqual(select_payloads({"a14_previews": "invalid"}, {"human_review_preview"}), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
