#!/usr/bin/env python3
from __future__ import annotations

import unittest

from semantic_memory import validate_document
from semantic_sync import _prefixes, row_to_document, semantic_row_eligible


ROW={
    "observation_id":"obs_12345678-1234-1234-1234-123456789012",
    "provider_id":"eurostat_prices",
    "response_excerpt":"Eurostat aggregate price signal for Portugal",
    "evidence_id":"evd_12345678-1234-1234-1234-123456789012",
    "territory_key":"money",
    "observed_at":"2026-09-23T12:00:00Z",
    "confidence":.8,
    "source_class":"public_web",
    "grounding_state":"grounded",
    "independent_roots":["https://ec.europa.eu/eurostat"],
    "need_id":None,
    "intent_id":None,
    "semantic_observation_id":None,
}


class SemanticSyncTests(unittest.TestCase):
    def test_prefix_allowlist_is_explicit(self):
        self.assertEqual(_prefixes("eurostat_, openalex_"),("eurostat_","openalex_"))
        self.assertTrue(semantic_row_eligible(ROW,provider_prefixes=("eurostat_",)))
        self.assertFalse(semantic_row_eligible(ROW,provider_prefixes=()))
        self.assertFalse(semantic_row_eligible(
            {**ROW,"provider_id":"base_pt_contracts"},
            provider_prefixes=("eurostat_",),
        ))

    def test_projection_document_is_system_not_publication_authority(self):
        doc=row_to_document(ROW)
        self.assertEqual(doc.document_id,"a13:"+ROW["observation_id"])
        self.assertEqual(doc.evidence_ref,ROW["evidence_id"])
        self.assertEqual(doc.privacy_class,"system")
        self.assertEqual(doc.knowledge_type,"OBSERVATION")
        self.assertEqual(doc.metadata["source_projection"],"a13")
        self.assertEqual(doc.metadata["independent_root_count"],1)
        validate_document(doc)

    def test_missing_text_or_evidence_is_not_embedded(self):
        self.assertFalse(semantic_row_eligible(
            {**ROW,"response_excerpt":""},
            provider_prefixes=("eurostat_",),
        ))
        self.assertFalse(semantic_row_eligible(
            {**ROW,"evidence_id":None},
            provider_prefixes=("eurostat_",),
        ))


if __name__=="__main__":
    unittest.main(verbosity=2)
