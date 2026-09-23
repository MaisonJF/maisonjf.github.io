#!/usr/bin/env python3
from __future__ import annotations

import unittest

from local_embeddings import MultilingualE5SmallProvider


class LocalEmbeddingTests(unittest.TestCase):
    def test_e5_is_pinned_and_384_dimensions(self):
        self.assertEqual(MultilingualE5SmallProvider.dimensions,384)
        self.assertIn("@",MultilingualE5SmallProvider.model_id)
        self.assertEqual(len(MultilingualE5SmallProvider.revision),40)

    def test_e5_prefixes_are_correct(self):
        self.assertEqual(
            MultilingualE5SmallProvider.prepare_query(" vela natal "),
            "query: vela natal",
        )
        self.assertEqual(
            MultilingualE5SmallProvider.prepare_document(" vela natal "),
            "passage: vela natal",
        )

    def test_empty_text_rejected(self):
        with self.assertRaises(ValueError):
            MultilingualE5SmallProvider.prepare_query("  ")


if __name__=="__main__":
    unittest.main(verbosity=2)
