#!/usr/bin/env python3
from __future__ import annotations

import unittest

from semantic_pgvector import PgvectorError, _vector_literal


class SemanticPgvectorPureTests(unittest.TestCase):
    def test_vector_dimension_mismatch_is_rejected(self):
        with self.assertRaises(PgvectorError):
            _vector_literal([1.0,2.0],3)

    def test_vector_literal_is_deterministic(self):
        self.assertEqual(_vector_literal([1,2.5,-3],3),"[1,2.5,-3]")


if __name__=="__main__":
    unittest.main(verbosity=2)
