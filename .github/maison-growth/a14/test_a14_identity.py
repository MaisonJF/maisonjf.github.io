#!/usr/bin/env python3
from __future__ import annotations

import re
import unittest

from brain_bridge import (
    A14Policy,
    build_distribution_match,
    build_offer_hypothesis,
    build_opportunity_record,
)
from opportunity_engine import EvidenceMetric, MoneyMetric


UUID_ID=re.compile(r"^(opp|ofh|dma)_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def metric(value: float, ref: str="evd_a") -> EvidenceMetric:
    return EvidenceMetric(value,"OBSERVED",0.8,(ref,))


def money(value: int | None, ref: str="evd_money") -> MoneyMetric:
    if value is None:
        return MoneyMetric(None)
    return MoneyMetric(value,"EUR","OBSERVED",0.8,(ref,),"fixture")


POLICY=A14Policy(
    policy_version="a14_identity_test_v1",
    opportunity_weights={"demand":1.0},
    distribution_weights={"topic_fit":1.0},
    minimum_distribution_fit=60,
    minimum_distribution_confidence=.5,
)


class A14IdentityTests(unittest.TestCase):
    def opportunity(self, *, evidence_ref: str="evd_a"):
        return build_opportunity_record(
            need_id=None,
            territory_code="gifting",
            metrics={"demand":metric(80,evidence_ref)},
            evidence_refs=(evidence_ref,),
            reason_codes=("test",),
            existing_solution_ids=(),
            knowledge_context_refs=("ocean:gifting",),
            rule_version_id=POLICY.policy_version,
            model_version_id=None,
            policy=POLICY,
        )

    def offer(self, opportunity_id: str, *, economics=None):
        return build_offer_hypothesis(
            opportunity_id=opportunity_id,
            offer_type="corporate_gifting",
            existing_solution_ids=(),
            fit_metrics={"demand":metric(75)},
            evidence_refs=("evd_a",),
            reason_codes=("fixture",),
            validation_mode="b2b_pilot",
            economics=economics or {},
            policy=POLICY,
        )

    def distribution(self, offer_id: str, *, moment="christmas"):
        return build_distribution_match(
            offer_hypothesis_id=offer_id,
            amplifier_ref="a13:entity:fixture",
            moment_key=moment,
            story_angle_key="corporate_gifting",
            channel_class="b2b",
            fit_metrics={"topic_fit":metric(90)},
            direct_cost=money(None),
            expected_direct_revenue=money(None),
            expected_direct_margin=money(None),
            monetized_indirect_value=money(None),
            policy=POLICY,
            seedable=False,
        )

    def test_same_opportunity_input_keeps_same_id(self):
        a=self.opportunity()
        b=self.opportunity()
        self.assertEqual(a["input_hash"],b["input_hash"])
        self.assertEqual(a["opportunity_id"],b["opportunity_id"])
        self.assertRegex(a["opportunity_id"],UUID_ID)

    def test_changed_opportunity_evidence_changes_id(self):
        a=self.opportunity(evidence_ref="evd_a")
        b=self.opportunity(evidence_ref="evd_b")
        self.assertNotEqual(a["input_hash"],b["input_hash"])
        self.assertNotEqual(a["opportunity_id"],b["opportunity_id"])

    def test_same_offer_semantics_keep_same_id(self):
        opp=self.opportunity()
        a=self.offer(opp["opportunity_id"])
        b=self.offer(opp["opportunity_id"])
        self.assertEqual(a["offer_hypothesis_id"],b["offer_hypothesis_id"])
        self.assertRegex(a["offer_hypothesis_id"],UUID_ID)

    def test_changed_offer_economics_change_id(self):
        opp=self.opportunity()
        a=self.offer(opp["opportunity_id"],economics={"capital_required_minor":1000})
        b=self.offer(opp["opportunity_id"],economics={"capital_required_minor":2000})
        self.assertNotEqual(a["offer_hypothesis_id"],b["offer_hypothesis_id"])

    def test_same_distribution_context_keeps_same_id(self):
        opp=self.opportunity()
        offer=self.offer(opp["opportunity_id"])
        a=self.distribution(offer["offer_hypothesis_id"])
        b=self.distribution(offer["offer_hypothesis_id"])
        self.assertEqual(a["distribution_match_id"],b["distribution_match_id"])
        self.assertRegex(a["distribution_match_id"],UUID_ID)

    def test_changed_moment_changes_distribution_id(self):
        opp=self.opportunity()
        offer=self.offer(opp["opportunity_id"])
        a=self.distribution(offer["offer_hypothesis_id"],moment="christmas")
        b=self.distribution(offer["offer_hypothesis_id"],moment="valentines")
        self.assertNotEqual(a["distribution_match_id"],b["distribution_match_id"])


if __name__=="__main__":
    unittest.main(verbosity=2)
