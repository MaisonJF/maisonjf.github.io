#!/usr/bin/env python3
from __future__ import annotations

import unittest

from content_bridge import content_event_to_learning
from engine import LearningError

RUL="rul_"+"a"*36

def event(**metadata):
    base={
        "content_id":"cnt-piece-001",
        "channel":"instagram_reels",
        "reach":1200,
        "link_clicks":84,
        "click_rate_bps":700,
        "source_refs_hash":"a"*64,
    }
    base.update(metadata)
    return {
        "event_id":"evt_"+"1"*36,
        "source":"maison-content-distribution",
        "event_type":"content.performance_observed",
        "privacy_class":"aggregated",
        "metadata":base,
    }

class ContentLearningBridgeTests(unittest.TestCase):
    def test_audience_volume_is_not_independent_observation_count(self):
        record=content_event_to_learning(
            event(),
            confidence_before=60,
            rule_version_id=RUL,
        )
        self.assertEqual(record.observed_json["observation_count"],1)
        self.assertEqual(record.observed_json["ctr_bps"],700)
        self.assertIsNone(record.observed_json["economic_value_minor"])
        self.assertEqual(record.confidence_delta,0)
        self.assertIn("INSUFFICIENT_OBSERVATIONS",record.reason_codes)

    def test_content_metadata_cannot_smuggle_economic_value(self):
        with self.assertRaises(LearningError):
            content_event_to_learning(
                event(economic_value_minor=9999),
                confidence_before=60,
                rule_version_id=RUL,
            )

    def test_non_a3_economics_rejected(self):
        with self.assertRaises(LearningError):
            content_event_to_learning(
                event(),
                confidence_before=60,
                rule_version_id=RUL,
                independent_snapshot_count=3,
                a3_economics={
                    "source":"content",
                    "observed_economic_value_minor":1300,
                    "economic_observation_count":1,
                },
            )

    def test_a3_economics_can_drive_bounded_learning_after_independent_snapshots(self):
        record=content_event_to_learning(
            event(),
            confidence_before=60,
            rule_version_id=RUL,
            independent_snapshot_count=3,
            a3_economics={
                "source":"A3",
                "expected_economic_value_minor":1000,
                "observed_economic_value_minor":1300,
                "economic_observation_count":1,
            },
        )
        self.assertEqual(record.signal_class,"positive")
        self.assertGreater(record.confidence_delta,0)
        self.assertIn("ECONOMIC_OUTCOME_ABOVE_EXPECTATION",record.reason_codes)

    def test_privacy_class_must_remain_aggregated(self):
        bad=event()
        bad["privacy_class"]="pseudonymous"
        with self.assertRaises(LearningError):
            content_event_to_learning(bad,confidence_before=60,rule_version_id=RUL)

if __name__=="__main__":
    unittest.main(verbosity=2)
