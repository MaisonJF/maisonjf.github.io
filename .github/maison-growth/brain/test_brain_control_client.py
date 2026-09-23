#!/usr/bin/env python3
from __future__ import annotations

import unittest

from brain_control_client import BrainControlClient, BrainControlError, _safe_base_url
from brain_observe_cycle import _offer_types_by_territory, _solutions_by_territory


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
