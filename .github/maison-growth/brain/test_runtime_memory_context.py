#!/usr/bin/env python3
from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from runtime_memory_context import collect_runtime_memory_context, representative_queries


class RuntimeMemoryContextTests(unittest.TestCase):
    def test_representative_query_is_longest_per_territory(self):
        feed=[
            {"territory_key":"home","response_excerpt":"curto"},
            {"territory_key":"home","response_excerpt":"texto muito mais comprido sobre casa"},
            {"territory_key":"work","response_excerpt":"emprego e trabalho"},
        ]
        out=dict(representative_queries(feed,max_territories=8))
        self.assertEqual(out["home"],"texto muito mais comprido sobre casa")
        self.assertEqual(out["work"],"emprego e trabalho")

    def test_runtime_memories_are_disabled_by_default(self):
        feed=[{"territory_key":"home","response_excerpt":"casa e conforto"}]
        with patch.dict(os.environ,{
            "MAISON_SEMANTIC_CONTEXT_ENABLED":"false",
            "MAISON_OSIRIS_CONTEXT_ENABLED":"false",
        },clear=False):
            result=collect_runtime_memory_context(feed)
        self.assertEqual(result.refs_by_territory,{})
        self.assertEqual(result.status["semantic"]["state"],"disabled")
        self.assertEqual(result.status["osiris"]["state"],"disabled")
        self.assertEqual(result.status["independent_evidence_roots_added"],0)

    def test_limits_are_bounded(self):
        with self.assertRaises(ValueError):
            representative_queries([],max_territories=0)
        with patch.dict(os.environ,{
            "MAISON_MEMORY_CONTEXT_LIMIT":"99",
            "MAISON_SEMANTIC_CONTEXT_ENABLED":"false",
            "MAISON_OSIRIS_CONTEXT_ENABLED":"false",
        },clear=False):
            with self.assertRaises(ValueError):
                collect_runtime_memory_context([])


if __name__=="__main__":
    unittest.main(verbosity=2)
