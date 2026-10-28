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

    def test_specialist_oceans_and_pillars_are_searchable_without_becoming_evidence(self):
        ctx=OceanEditorialContext({
            "candidates":[
                {"id":"human-signal-one","preferredLabel":"descanso e pausa","painLanguage":"procurar tranquilidade em casa"}
            ],
            "specialistOceans":[{
                "ocean_key":"brand-tom-ford",
                "display_name":"Tom Ford",
                "pillar_key":"designer-luxury-houses",
                "mission":"Estudar catálogo, variantes, campanhas, posicionamento e princípios transferíveis de uma Maison.",
                "focus":["perfumaria","campanhas","variantes"],
                "connections":["brand-dior","brand-yves-saint-laurent"],
                "visibility":"internal"
            }],
            "specialistPillars":[{
                "key":"designer-luxury-houses",
                "name":"Maisons de moda e luxo",
                "mission":"Estudar casas de moda e luxo individualmente, incluindo linhas, variantes, códigos de marca e posicionamento.",
                "connections":["storytelling-brand-voice","visual-sensory-design"],
                "origin":"foundational_catalog"
            }]
        })
        hits=ctx.search("Tom Ford campanhas variantes perfumaria",limit=12)
        ocean=next(hit for hit in hits if hit.ref=="specialist-ocean:brand-tom-ford")
        self.assertEqual(ocean.source_kind,"ocean_specialist_metadata")
        self.assertEqual(ocean.evidence_refs,())
        pillar_hits=ctx.search("Maisons luxo posicionamento códigos de marca",limit=12)
        pillar=next(hit for hit in pillar_hits if hit.ref=="specialist-pillar:designer-luxury-houses")
        self.assertEqual(pillar.source_kind,"ocean_pillar_metadata")
        self.assertEqual(pillar.evidence_refs,())

    def test_runtime_ocean_registry_overlays_snapshot_and_adds_approved_dynamic_records(self):
        import json
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            canonical=root/"candidates.json"
            snapshot=root/"ocean-catalog.generated.json"
            canonical.write_text(json.dumps({"candidates":[]}),encoding="utf-8")
            snapshot.write_text(json.dumps({
                "catalog_version":"JF-OCEANS-2026.10.2",
                "oceans":[{
                    "ocean_key":"brand-tom-ford","display_name":"Tom Ford",
                    "pillar_key":"designer-luxury-houses",
                    "mission":"Estudar a marca e as suas variantes.",
                    "focus":["perfumaria"],"connections":["brand-dior"]
                }],
                "pillars":[{
                    "key":"designer-luxury-houses","name":"Maisons de moda e luxo",
                    "mission":"Estudar as casas de luxo.","connections":["visual-sensory-design"]
                }]
            }),encoding="utf-8")
            runtime={
                "kind":"ocean_specialist_catalog",
                "version":"JF-OCEANS-2026.10.2",
                "rows":[
                    {"ocean_key":"brand-tom-ford","display_name":"Tom Ford",
                     "pillar_key":"designer-luxury-houses","mission":"Tom Ford: catálogo, campanhas e variantes.",
                     "focus":["perfumaria","campanhas"],"connections":["brand-dior"],"lifecycle_state":"open"},
                    {"ocean_key":"approved-dynamic-ocean","display_name":"Ocean aprovado novo",
                     "pillar_key":"designer-luxury-houses","mission":"Investigar uma área aprovada ainda sem cobertura especializada.",
                     "focus":["área emergente","investigação"],"connections":["brand-tom-ford"],"lifecycle_state":"open"}
                ],
                "pillars":[
                    {"key":"designer-luxury-houses","name":"Maisons de moda e luxo",
                     "mission":"Estudar casas de luxo com contexto e evidência.",
                     "connections":["visual-sensory-design"],"lifecycle_state":"open"},
                    {"key":"approved-dynamic-pillar","name":"Pilar aprovado novo",
                     "mission":"Organizar um novo território de conhecimento.",
                     "focus":["nova área","investigação"],"connections":["designer-luxury-houses"],"lifecycle_state":"open"}
                ]
            }
            ctx=OceanEditorialContext.from_files(canonical,snapshot,runtime_catalog=runtime)
            self.assertTrue(ctx.payload["specialistRuntimeLoaded"])
            self.assertEqual(ctx.payload["specialistCatalogSource"],"private_runtime_plus_snapshot")
            oceans=ctx._specialist_oceans()
            keys={row["ocean_key"] for row in oceans}
            self.assertEqual(len(keys),2,"runtime rows overlay the same stable key instead of duplicating it")
            self.assertIn("approved-dynamic-ocean",keys)
            pillars={row["key"] for row in ctx._specialist_pillars()}
            self.assertIn("approved-dynamic-pillar",pillars)
            hits=ctx.search("Ocean aprovado novo área investigação",limit=10)
            self.assertTrue(any(hit.ref=="specialist-ocean:approved-dynamic-ocean" for hit in hits))
            self.assertTrue(all(not hit.evidence_refs for hit in hits if hit.ref.startswith("specialist-")))

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
