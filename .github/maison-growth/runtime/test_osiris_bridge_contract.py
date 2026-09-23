#!/usr/bin/env python3
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent


class OsirisBridgeContractTests(unittest.TestCase):
    def setUp(self):
        self.bridge=(ROOT/"osiris_bridge.py").read_text(encoding="utf-8")
        self.compose=(ROOT/"docker-compose.observe.yml").read_text(encoding="utf-8")
        self.requirements=(ROOT/"requirements-brain-core.txt").read_text(encoding="utf-8")

    def test_bridge_writes_only_through_actions_waist(self):
        self.assertIn("from src.actions.core import Actions",self.bridge)
        self.assertIn("create_or_find_object(",self.bridge)
        self.assertIn("assert_property(",self.bridge)
        for forbidden in ("INSERT INTO objects","INSERT INTO assertions","UPDATE assertions","DELETE FROM objects"):
            self.assertNotIn(forbidden,self.bridge)

    def test_bridge_requires_bearer_and_direct_observation_provenance(self):
        self.assertIn("MAISON_OSIRIS_BRIDGE_TOKEN",self.bridge)
        self.assertIn("hmac.compare_digest",self.bridge)
        self.assertIn("EvidenceClass.DIRECT_OBSERVATION",self.bridge)

    def test_private_ports_are_loopback_only(self):
        published=[
            line.strip() for line in self.compose.splitlines()
            if re.search(r'-\s*"[^"]+:[0-9]+"',line)
        ]
        self.assertTrue(published)
        self.assertTrue(all('"127.0.0.1:' in line for line in published))

    def test_osiris_context_uses_pinned_mcp_sdk(self):
        self.assertIn("mcp==1.28.1",self.requirements)
        self.assertIn("osiris-context-smoke:",self.compose)
        self.assertIn("http://osiris-mcp:8790/mcp",self.compose)


if __name__=="__main__":
    unittest.main(verbosity=2)
