#!/usr/bin/env python3
from __future__ import annotations

import unittest

from materialize_a14 import build_materialization_payload


def preview(state: str) -> dict:
    return {
        "state":state,
        "opportunity":{"opportunity_id":"opp_"+"1"*36},
        "offer_hypotheses":[{"offer_hypothesis_id":"ofh_"+"2"*36}],
        "distribution_matches":[],
        "a12_review_payloads":[{
            "opportunity_id":"opp_"+"1"*36,
            "offer_hypothesis_id":"ofh_"+"2"*36,
        }],
    }


class MaterializeA14Tests(unittest.TestCase):
    def test_human_review_preview_queues_a12(self):
        payload=build_materialization_payload(preview("human_review_preview"))
        self.assertTrue(payload["queue_for_human"])
        self.assertEqual(len(payload["a12_review_payloads"]),1)

    def test_enrichment_preview_persists_without_queue(self):
        payload=build_materialization_payload(preview("enrichment_required"))
        self.assertFalse(payload["queue_for_human"])
        self.assertEqual(payload["a12_review_payloads"],[])

    def test_missing_offers_is_rejected(self):
        row=preview("human_review_preview")
        row["offer_hypotheses"]=[]
        with self.assertRaises(ValueError):
            build_materialization_payload(row)


if __name__=="__main__":
    unittest.main(verbosity=2)
