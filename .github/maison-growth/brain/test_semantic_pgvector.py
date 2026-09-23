#!/usr/bin/env python3
from __future__ import annotations

import unittest

from semantic_pgvector import PgvectorError, PgvectorSemanticMemory, _vector_literal


class SemanticPgvectorPureTests(unittest.TestCase):
    def test_vector_dimension_mismatch_is_rejected(self):
        with self.assertRaises(PgvectorError):
            _vector_literal([1.0,2.0],3)

    def test_vector_literal_is_deterministic(self):
        self.assertEqual(_vector_literal([1,2.5,-3],3),"[1,2.5,-3]")

    def test_search_parameter_order(self):
        class Embed:
            model_id="m1"; dimensions=3
            def embed(self,text): return [1,2,3]
        class Cursor:
            def __init__(self): self.params=None
            def execute(self,sql,params): self.params=list(params)
            def fetchall(self): return []
            def __enter__(self): return self
            def __exit__(self,*args): return False
        class Conn:
            def __init__(self): self.cursor_obj=Cursor()
            def cursor(self): return self.cursor_obj
        conn=Conn()
        memory=object.__new__(PgvectorSemanticMemory)
        memory.conn=conn
        memory.embedder=Embed()
        memory.search("q",limit=5,filters={"territory_key":"casa"})
        self.assertEqual(conn.cursor_obj.params,["[1,2,3]","m1","casa","[1,2,3]",5])


if __name__=="__main__":
    unittest.main(verbosity=2)
