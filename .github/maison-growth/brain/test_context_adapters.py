#!/usr/bin/env python3
from __future__ import annotations

import unittest

from brain_observe_cycle import _commercial_asset_query
from commercial_assets import CommercialAssetContext
from knowledge_context import OceanEditorialContext, ReferenceContext, compose_context
from prebrain_adapters import RupturesAdapter


class ContextAdapterTests(unittest.TestCase):
    def test_ocean_context_uses_metadata_not_paid_bodies(self):
        ctx=OceanEditorialContext({
            "pdiGrowth":{"themes":[{
                "candidateKey":"dinheiro-e-seguranca",
                "preferredLabel":"Dinheiro & Segurança",
                "evidence":[{"source":"oracle","sourceId":"dinheiro","focus":"dinheiro segurança gasto dívida margem","family":"Dinheiro & Segurança"}],
                "bodyStored":False
            }]}
        })
        hits=ctx.search("margem e dinheiro")
        self.assertEqual(hits[0].ref,"ocean:dinheiro-e-seguranca")
        self.assertNotIn("body",hits[0].label.lower())

    def test_ocean_commercial_hints_deduplicate_question_and_oracle_rows(self):
        ctx=OceanEditorialContext({
            "items":[
                {
                    "type":"question_candidate",
                    "territory":"adiar-o-sono-para-recuperar-autonomia",
                    "painLanguage":"A noite parece o primeiro momento próprio depois de muitas obrigações.",
                    "intent":"recuperar autonomia e transitar para descanso",
                    "commercialAdjacency":"Ritual Volta Para Casa; aromas por momento humano",
                    "questionThemeCandidates":["tempo que é meu","transição para descanso"],
                    "evidence":["external source should not become a commercial ref"],
                },
                {
                    "type":"oracle_candidate",
                    "territory":"adiar-o-sono-para-recuperar-autonomia",
                    "painLanguage":"A noite parece o primeiro momento próprio depois de muitas obrigações.",
                    "intent":"recuperar autonomia e transitar para descanso",
                    "commercialAdjacency":"Ritual Volta Para Casa; aromas por momento humano",
                    "evidence":["another external source"],
                },
            ]
        })
        hits=ctx.commercial_hints("noite obrigações descanso autonomia")
        self.assertEqual(len(hits),1)
        self.assertEqual(
            hits[0].ref,
            "ocean-commercial:adiar-o-sono-para-recuperar-autonomia",
        )
        self.assertIn("Ritual Volta Para Casa",hits[0].commercial_adjacency)
        self.assertNotIn("external source",repr(hits[0]))

    def test_ocean_commercial_hint_enriches_asset_query_without_becoming_evidence(self):
        ocean=OceanEditorialContext({
            "items":[{
                "type":"question_candidate",
                "territory":"pausa-em-casa",
                "painLanguage":"quero desligar depois de um dia cheio",
                "intent":"marcar uma passagem para tempo próprio",
                "commercialAdjacency":"aroma ambiente ritual casa pausa",
                "questionThemeCandidates":["mudar o ar","ritual de pausa"],
            }]
        })
        hint=ocean.commercial_hints("desligar depois de um dia cheio",limit=3)
        query=_commercial_asset_query("desligar depois de um dia cheio",hint)
        registry={
            "assets":[
                {
                    "asset_ref":"catalog:product:nevoa",
                    "asset_type":"physical_product",
                    "lifecycle_status":"active",
                    "public":True,
                    "name":"Névoa de Ambiente",
                    "category":"Casa",
                    "description":"Uma forma rápida de mudar o ambiente através do aroma.",
                    "search_context":["aroma","ambiente","casa","muda o ar"],
                    "price_minor":700,
                    "currency":"EUR",
                    "catalogue_availability":"in_stock",
                    "operational":{
                        "inventory_quantity":None,
                        "reserved_quantity":None,
                        "unit_material_cost_minor":None,
                        "packaging_cost_minor":None,
                        "production_minutes_per_unit":None,
                        "batch_capacity_units":None,
                        "moq_units":None,
                        "shelf_life_days":None,
                        "supplier_lead_days":None,
                    },
                }
            ]
        }
        assets=CommercialAssetContext(registry)
        hits=assets.search(query)
        self.assertEqual(hits[0].ref,"asset:catalog:product:nevoa")
        self.assertIn("inventory_quantity",hits[0].unknown_operational_fields)
        self.assertEqual(hits[0].operational_evidence_refs,())

    def test_context_composes_ocean_semantic_and_osiris_refs(self):
        ocean=OceanEditorialContext({"pdiGrowth":{"themes":[{
            "candidateKey":"trabalho-e-caminho","preferredLabel":"Trabalho & Caminho",
            "evidence":[{"source":"oracle","sourceId":"trabalho","focus":"mudança trabalho carreira","family":"Trabalho"}]
        }]}})
        semantic=ReferenceContext(source_kind="semantic_memory",refs=[{
            "ref":"semantic:abc","label":"mudança de carreira","score":.9,"evidence_refs":["evd_1"]
        }])
        osiris=ReferenceContext(source_kind="osiris_memory",refs=[{
            "ref":"osiris:rel:123","label":"trabalho mudança","score":.8,"evidence_refs":["evd_2"]
        }])
        hits=compose_context("mudança trabalho",(ocean,semantic,osiris))
        self.assertEqual({h.source_kind for h in hits},{"ocean_editorial_metadata","semantic_memory","osiris_memory"})

    def test_ruptures_short_series_is_safe_without_dependency(self):
        result=RupturesAdapter().detect([1.0,2.0])
        self.assertEqual(result.breakpoints,())


if __name__=="__main__":
    unittest.main(verbosity=2)
