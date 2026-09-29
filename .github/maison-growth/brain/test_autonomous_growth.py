#!/usr/bin/env python3
import unittest
from types import SimpleNamespace
from autonomous_growth import route_growth_packet

def packet(safe=True,status="candidate"):
    return SimpleNamespace(
      critic=SimpleNamespace(safe_to_forward=safe),
      scout=SimpleNamespace(status=status,reuse_routes=("game_question","oracle_block","social_post","seo_opportunity","new_product_candidate"),evidence_refs=("ev:1","ev:2"),scout_id="sct_test"),
      offer_concepts=(SimpleNamespace(offer_type="digital_product"),)
    )

class AutonomousGrowthTests(unittest.TestCase):
    def test_routes_editorial_and_product_without_execution_authority(self):
        out=route_growth_packet(packet())
        self.assertEqual(out["state"],"routed")
        routes={x["route"]:x for x in out["work"]}
        self.assertIn("game_question",routes)
        self.assertIn("oracle_block",routes)
        self.assertIn("social_post",routes)
        self.assertIn("seo_opportunity",routes)
        self.assertIn("digital_product",routes)
        self.assertFalse(routes["game_question"]["public_write_authorized"])
        self.assertFalse(routes["digital_product"]["launch_authorized"])
        self.assertFalse(routes["digital_product"]["spend_authorized"])
    def test_critic_rejection_stops_factory(self):
        self.assertEqual(route_growth_packet(packet(False))["work"],[])
    def test_non_candidate_stops_factory(self):
        self.assertEqual(route_growth_packet(packet(True,"observe"))["work"],[])

if __name__=="__main__":
    unittest.main(verbosity=2)
