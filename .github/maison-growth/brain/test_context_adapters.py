#!/usr/bin/env python3
from __future__ import annotations

import unittest

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
