#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest
from pathlib import Path

from commercial_assets import CommercialAssetContext, CommercialAssetError
from prebrain import Signal, converge_signals
from scout import discover


ROOT=Path(__file__).resolve().parent


class CommercialAssetTests(unittest.TestCase):
    def registry(self):
        return json.loads((ROOT/"commercial-assets.generated.json").read_text(encoding="utf-8"))

    def test_generated_registry_has_real_catalogue_and_unknown_operations(self):
        ctx=CommercialAssetContext(self.registry())
        summary=ctx.summary()
        self.assertEqual(summary["asset_count"],19)
        self.assertFalse(summary["private_overlay_loaded"])
        self.assertEqual(summary["known_operational_fields"],0)
        self.assertGreater(summary["unknown_operational_fields"],0)
        self.assertFalse(summary["catalogue_in_stock_is_counted_inventory"])

        by_ref={row["asset_ref"]:row for row in self.registry()["assets"]}
        self.assertIn("catalog:digital:pdi",by_ref)
        self.assertIn("catalog:digital:oracle",by_ref)
        self.assertEqual(by_ref["catalog:digital:pdi"]["price_minor"],500)
        self.assertEqual(by_ref["catalog:digital:oracle"]["price_minor"],200)
        self.assertEqual(by_ref["catalog:digital:pdi"]["asset_type"],"digital_product")

    def test_service_pricing_is_structured_without_flattening_multi_format_or_quote_offers(self):
        by_ref={row["asset_ref"]:row for row in self.registry()["assets"]}

        acompanhamento=by_ref["catalog:service:acompanhamento"]
        self.assertEqual(acompanhamento["price_kind"],"fixed")
        self.assertEqual(acompanhamento["price_minor"],17000)
        self.assertEqual(acompanhamento["price_source"],"price_label")

        presenca=by_ref["catalog:service:companhia"]
        self.assertEqual(presenca["price_kind"],"multi_format")
        self.assertIsNone(presenca["price_minor"])
        self.assertEqual(presenca["minimum_price_minor"],3500)
        self.assertEqual(len(presenca["price_options"]),5)
        self.assertIn(
            {"label":"Presença Online","amount_minor":3500},
            presenca["price_options"],
        )

        mentoria=by_ref["catalog:service:mentoria"]
        self.assertEqual(mentoria["price_kind"],"starting_from")
        self.assertEqual(mentoria["minimum_price_minor"],12500)
        self.assertIsNone(mentoria["price_minor"])

        b2b=by_ref["catalog:service:b2b"]
        self.assertEqual(b2b["price_kind"],"quote")
        self.assertIsNone(b2b["minimum_price_minor"])

    def test_stocktake_template_contains_all_active_public_physical_assets_only(self):
        template=json.loads((ROOT/"commercial-stocktake.template.json").read_text(encoding="utf-8"))
        self.assertEqual(template["target_overlay_schema"],"commercial_asset_overlay_v1")
        refs={row["asset_ref"] for row in template["assets"]}
        self.assertEqual(refs,{
            "catalog:product:escalda-pes",
            "catalog:product:nevoa",
            "catalog:product:oleo-massagem",
            "catalog:product:vela-pequena",
            "catalog:product:vela-vidro",
        })
        self.assertIsNone(template["observed_at"])
        for row in template["assets"]:
            self.assertEqual(row["source"],"manual_stocktake")
            self.assertEqual(row["evidence_refs"],[])
            self.assertTrue(all(value is None for value in row["operational"].values()))

    def test_operations_facts_template_covers_active_public_physical_assets(self):
        template=json.loads((ROOT/"commercial-operations-facts.template.json").read_text(encoding="utf-8"))
        self.assertEqual(template["target_overlay_schema"],"commercial_asset_overlay_v1")
        refs={row["asset_ref"] for row in template["assets"]}
        self.assertEqual(refs,{
            "catalog:product:escalda-pes",
            "catalog:product:nevoa",
            "catalog:product:oleo-massagem",
            "catalog:product:vela-pequena",
            "catalog:product:vela-vidro",
        })
        self.assertIsNone(template["observed_at"])
        for row in template["assets"]:
            self.assertEqual(row["source"],"manual_operations_review")
            self.assertEqual(row["evidence_refs"],[])
            self.assertTrue(all(value is None for value in row["operational"].values()))

    def test_service_capacity_template_contains_all_active_public_services(self):
        template=json.loads((ROOT/"commercial-service-capacity.template.json").read_text(encoding="utf-8"))
        self.assertEqual(template["target_overlay_schema"],"commercial_asset_overlay_v1")
        refs={row["asset_ref"] for row in template["assets"]}
        self.assertEqual(refs,{
            "catalog:service:acompanhamento",
            "catalog:service:b2b",
            "catalog:service:companhia",
            "catalog:service:mentoria",
            "catalog:service:pedidos-especiais",
            "catalog:service:ritual-personalizado",
            "catalog:service:tarot",
        })
        self.assertIsNone(template["observed_at"])
        for row in template["assets"]:
            self.assertEqual(row["source"],"manual_capacity_review")
            self.assertEqual(row["evidence_refs"],[])
            self.assertTrue(all(value is None for value in row["operational"].values()))

    def test_digital_operations_template_contains_only_oracle_and_pdi(self):
        template=json.loads((ROOT/"commercial-digital-operations.template.json").read_text(encoding="utf-8"))
        self.assertEqual(template["target_overlay_schema"],"commercial_asset_overlay_v1")
        refs={row["asset_ref"] for row in template["assets"]}
        self.assertEqual(refs,{"catalog:digital:oracle","catalog:digital:pdi"})
        self.assertIsNone(template["observed_at"])
        for row in template["assets"]:
            self.assertEqual(row["source"],"manual_digital_delivery_review")
            self.assertEqual(row["evidence_refs"],[])
            self.assertEqual(set(row["operational"]),{
                "human_effort_minutes","variable_cost_minor","delivery_lead_days"
            })
            self.assertTrue(all(value is None for value in row["operational"].values()))

    def test_search_exposes_oracle_and_pdi_to_brain_context(self):
        ctx=CommercialAssetContext(self.registry())
        oracle_hits=ctx.search("oráculo solidão companhia",limit=10)
        pdi_hits=ctx.search("pára ignorar perguntas conversa",limit=10)
        oracle=next(x for x in oracle_hits if x.ref=="asset:catalog:digital:oracle")
        pdi=next(x for x in pdi_hits if x.ref=="asset:catalog:digital:pdi")
        self.assertEqual(oracle.asset_type,"digital_product")
        self.assertEqual(oracle.price_minor,200)
        self.assertEqual(pdi.asset_type,"digital_product")
        self.assertEqual(pdi.price_minor,500)

    def test_search_finds_existing_product_without_claiming_stock_quantity(self):
        ctx=CommercialAssetContext(self.registry())
        hits=ctx.search("massagem toque corpo",limit=5)
        refs={x.ref for x in hits}
        self.assertIn("asset:catalog:product:oleo-massagem",refs)
        oil=next(x for x in hits if x.ref=="asset:catalog:product:oleo-massagem")
        self.assertEqual(oil.catalogue_availability,"in_stock")
        self.assertIn("inventory_quantity",oil.unknown_operational_fields)

    def test_known_private_operational_values_require_evidence(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-23T17:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:vela-vidro",
                "operational":{"inventory_quantity":6},
                "evidence_refs":[]
            }]
        }
        with self.assertRaises(CommercialAssetError):
            CommercialAssetContext(self.registry(),overlay=overlay)

    def test_private_overlay_adds_observed_stock_without_changing_catalogue(self):
        overlay={
            "schema_version":"commercial_asset_overlay_v1",
            "observed_at":"2026-09-23T17:00:00+01:00",
            "assets":[{
                "asset_ref":"catalog:product:vela-vidro",
                "source":"manual_stocktake",
                "operational":{"inventory_quantity":6,"packaging_cost_minor":80},
                "evidence_refs":["manual:stocktake:2026-09-23"]
            }]
        }
        ctx=CommercialAssetContext(self.registry(),overlay=overlay)
        hits=ctx.search("vela aroma luz",limit=10)
        candle=next(x for x in hits if x.ref=="asset:catalog:product:vela-vidro")
        self.assertIn("inventory_quantity",candle.known_operational_fields)
        self.assertIn("packaging_cost_minor",candle.known_operational_fields)
        self.assertEqual(candle.operational_evidence_refs,("manual:stocktake:2026-09-23",))
        self.assertEqual(ctx.summary()["overlay_asset_count"],1)

    def test_scout_marks_catalogue_asset_context_but_not_as_external_evidence(self):
        group=converge_signals((
            Signal(
                "obs_a","body","public_web","massagem toque corpo",
                ("evd_a",),("https://example.org/a",),
                "2026-09-23T10:00:00Z",.9,{}
            ),
        ),similarity_threshold=.5,minimum_independent_roots=1)[0]
        scout=discover(
            group,
            existing_solution_ids=(),
            knowledge_context_refs=("asset:catalog:product:oleo-massagem",),
            candidate_offer_types=("physical_product",),
            minimum_confidence=.5,
        )
        self.assertIn("existing_catalogue_asset_context",scout.reason_codes)
        self.assertEqual(scout.evidence_refs,("evd_a",))
        self.assertEqual(scout.independent_roots,("https://example.org/a",))


if __name__=="__main__":
    unittest.main(verbosity=2)
