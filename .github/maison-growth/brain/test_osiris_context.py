#!/usr/bin/env python3
from __future__ import annotations

import unittest

from osiris_context import OsirisContextError, _safe_mcp_url, normalize_graph_search


class OsirisContextTests(unittest.TestCase):
    def test_local_http_is_allowed(self):
        self.assertEqual(_safe_mcp_url("http://127.0.0.1:8790/mcp"),"http://127.0.0.1:8790/mcp")
        self.assertEqual(_safe_mcp_url("http://osiris-mcp:8790/mcp"),"http://osiris-mcp:8790/mcp")

    def test_remote_plain_http_is_rejected(self):
        with self.assertRaises(OsirisContextError):
            _safe_mcp_url("http://example.com/mcp")

    def test_graph_hits_normalize_without_becoming_evidence_confidence(self):
        hits=normalize_graph_search({"hits":[{
            "id":"abc","display_label":"A decisão","rank":0.5,
            "source":"agent:test","evidence_refs":["evd_1"]
        }]})
        self.assertEqual(hits[0].ref,"osiris:abc")
        self.assertEqual(hits[0].label,"A decisão")
        self.assertIn("evd_1",hits[0].evidence_refs)
        self.assertIn("osiris-source:agent:test",hits[0].evidence_refs)


if __name__=="__main__":
    unittest.main(verbosity=2)
