#!/usr/bin/env python3
from __future__ import annotations

import unittest

from brain_control_client import BrainControlClient, BrainControlError, _safe_base_url
from brain_observe_cycle import (
    _cash_context_by_territory,
    _b2b_context_by_territory,
    _learning_context_by_territory,
    _offer_types_by_territory,
    _solutions_by_territory,
)


class BrainControlClientTests(unittest.TestCase):
    def test_remote_http_is_rejected(self):
        with self.assertRaises(BrainControlError):
            _safe_base_url("http://example.com")

    def test_https_remote_and_local_http_are_allowed(self):
        self.assertEqual(_safe_base_url("https://brain.example/"),"https://brain.example")
        self.assertEqual(_safe_base_url("http://127.0.0.1:8787"),"http://127.0.0.1:8787")

    def test_client_sends_bearer_without_putting_secret_in_url(self):
        captured={}
        def transport(url,**kwargs):
            captured["url"]=url; captured.update(kwargs)
            return {"rows":[]}
        client=BrainControlClient("https://brain.example","top-secret",transport=transport)
        client.feed(limit=20)
        self.assertNotIn("top-secret",captured["url"])
        self.assertEqual(captured["token"],"top-secret")
        self.assertIn("limit=20",captured["url"])

    def test_learning_route_is_read_only_client_call(self):
        captured={}
        def transport(url,**kwargs):
            captured["url"]=url
            return {"rows":[]}
        client=BrainControlClient("https://brain.example","secret",transport=transport)
        client.learning(limit=15)
        self.assertIn("/internal/brain/learning",captured["url"])
        self.assertIn("limit=15",captured["url"])

    def test_b2b_feedback_route_is_read_only_client_call(self):
        captured={}
        def transport(url,**kwargs):
            captured["url"]=url
            return {"rows":[]}
        client=BrainControlClient("https://brain.example","secret",transport=transport)
        client.b2b_feedback(limit=12)
        self.assertIn("/internal/brain/b2b-feedback",captured["url"])
        self.assertIn("limit=12",captured["url"])

    def test_cloudflare_access_credentials_are_paired(self):
        with self.assertRaises(BrainControlError):
            BrainControlClient(
                "https://brain.example","secret",
                access_client_id="id",access_client_secret=None
            )

    def test_solution_territory_mapping_reuses_a4_relations(self):
        links=[
            {"territory_key":"home","solution_id":"sol_a"},
            {"territory_key":"home","solution_id":"sol_b"},
            {"territory_key":"home","solution_id":"sol_a"},
        ]
        self.assertEqual(_solutions_by_territory(links),{"home":("sol_a","sol_b")})

    def test_a11_context_is_correlation_only(self):
        feed=[{
            "territory_key":"home",
            "need_id":"ned_x",
            "intent_id":"int_x",
        }]
        learning=[
            {
                "learning_record_id":"lrn_good",
                "subject_type":"need",
                "subject_id":"ned_x",
                "correlation_only":True,
                "causal_claim":False,
            },
            {
                "learning_record_id":"lrn_causal",
                "subject_type":"need",
                "subject_id":"ned_x",
                "correlation_only":False,
                "causal_claim":True,
            },
        ]
        self.assertEqual(
            _learning_context_by_territory(feed,learning),
            {"home":("a11:lrn_good",)}
        )

    def test_a3_cash_context_is_reference_only_by_solution_territory(self):
        cash=[{
            "economic_assessment_id":"eva_x",
            "solution_id":"sol_a",
            "immediate_contribution_minor":2700,
        }]
        links=[{
            "territory_key":"home",
            "solution_id":"sol_a",
        }]
        self.assertEqual(
            _cash_context_by_territory(cash,links),
            {"home":("a3:eva_x",)}
        )

    def test_b2b_context_uses_solution_territory_links_only(self):
        b2b=[{
            "conversion_id":"cnv_x",
            "solution_id":"sol_b2b",
            "lifecycle_stage":"pilot",
            "business":"spa",
        }]
        links=[
            {"territory_key":"body","solution_id":"sol_b2b"},
            {"territory_key":"home","solution_id":"sol_other"},
        ]
        self.assertEqual(
            _b2b_context_by_territory(b2b,links),
            {"body":("b2b:pilot:cnv_x",)}
        )

    def test_offer_types_derive_from_existing_solution_types_plus_explicit_policy(self):
        links=[{"territory_key":"home","solution_id":"sol_a"}]
        solutions=[{"solution_id":"sol_a","solution_type":"physical_product"}]
        policy={"home":{"candidate_offer_types":["bundle","b2b"]}}
        self.assertEqual(
            _offer_types_by_territory(links,solutions,policy)["home"],
            ("physical_product","bundle","b2b")
        )


if __name__=="__main__":
    unittest.main(verbosity=2)
