#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from pathlib import Path

from build_commercial_attention import build_attention


ROOT=Path(__file__).resolve().parent


class CommercialAttentionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy=json.loads((ROOT/"commercial-attention-policy.json").read_text(encoding="utf-8"))
        cls.assets=json.loads((ROOT/"commercial-assets.generated.json").read_text(encoding="utf-8"))
        cls.editorial=json.loads((ROOT/"editorial-queue.json").read_text(encoding="utf-8"))
        cls.candidates=json.loads((ROOT.parent/"oceans"/"candidates.json").read_text(encoding="utf-8"))
        cls.payload=build_attention(
            policy=cls.policy,
            registry=cls.assets,
            editorial=cls.editorial,
            candidates=cls.candidates,
        )

    def test_projection_is_derived_from_current_sources(self):
        self.assertEqual(self.payload["source_assets"],"commercial-assets.generated.json")
        self.assertEqual(self.payload["source_oceans"],"../oceans/candidates.json")
        self.assertEqual(self.payload["source_editorial_context"],"editorial-queue.json")
        self.assertEqual(self.payload["summary"]["ranked_assets"],14)

    def test_attention_is_not_profit_or_execution_authority(self):
        self.assertTrue(self.payload["contract"]["attention_score_is_not_profit_score"])
        self.assertTrue(self.payload["contract"]["operational_unknowns_block_execution"])
        self.assertFalse(self.payload["contract"]["automatic_publication"])
        self.assertFalse(self.payload["contract"]["automatic_checkout"])
        self.assertEqual(self.payload["summary"]["execution_ready"],0)

        for asset in self.payload["assets"]:
            self.assertFalse(asset["profitability_known"])
            self.assertFalse(asset["ready_for_automatic_sale"])
            self.assertTrue(asset["operational_blockers"])
            self.assertFalse(asset["authority"]["public_write_authorized"])
            self.assertFalse(asset["authority"]["stock_promise_authorized"])
            self.assertFalse(asset["authority"]["automatic_checkout_authorized"])

    def test_physical_products_receive_ocean_attention_without_stock_inference(self):
        by_ref={row["asset_ref"]:row for row in self.payload["assets"]}
        for ref in (
            "catalog:product:nevoa",
            "catalog:product:escalda-pes",
            "catalog:product:vela-pequena",
            "catalog:product:vela-vidro",
            "catalog:product:oleo-massagem",
        ):
            row=by_ref[ref]
            self.assertGreater(row["attention_score"],0)
            self.assertNotIn("inventory_unknown",row["operational_blockers"])
            self.assertIn("replenishment_capacity_unknown",row["operational_blockers"])

        self.assertGreater(
            by_ref["catalog:product:nevoa"]["attention_score"],
            by_ref["catalog:product:oleo-massagem"]["attention_score"],
        )

    def test_oracle_and_pdi_are_ranked_as_digital_assets(self):
        by_ref={row["asset_ref"]:row for row in self.payload["assets"]}
        oracle=by_ref["catalog:digital:oracle"]
        pdi=by_ref["catalog:digital:pdi"]
        self.assertEqual(oracle["asset_type"],"digital_product")
        self.assertEqual(pdi["asset_type"],"digital_product")
        self.assertEqual(oracle["price_minor"],200)
        self.assertEqual(pdi["price_minor"],500)
        self.assertIn("variable_cost_unknown",oracle["operational_blockers"])
        self.assertIn("variable_cost_unknown",pdi["operational_blockers"])
        self.assertIn("human_effort_unknown",oracle["operational_blockers"])
        self.assertIn("human_effort_unknown",pdi["operational_blockers"])
        self.assertGreater(oracle["attention_score"],0)
        self.assertGreater(pdi["attention_score"],0)

    def test_presence_service_is_linked_to_relevant_ocean_territories(self):
        row=next(
            item for item in self.payload["assets"]
            if item["asset_ref"]=="catalog:service:companhia"
        )
        self.assertIn(
            "solidao-com-contacto-sem-conexao-de-qualidade",
            row["direct_ocean_territories"],
        )
        self.assertIn(
            "presenca-que-ampara-sem-tentar-resolver",
            row["direct_ocean_territories"],
        )
        self.assertIn("capacity_unknown",row["operational_blockers"])


if __name__=="__main__":
    unittest.main(verbosity=2)
