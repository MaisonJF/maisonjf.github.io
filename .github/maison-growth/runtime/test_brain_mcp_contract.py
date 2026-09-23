#!/usr/bin/env python3
from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parent
BRAIN=ROOT.parent/"brain"


class BrainMCPContractTests(unittest.TestCase):
    def setUp(self):
        self.source=(BRAIN/"brain_mcp_server.py").read_text(encoding="utf-8")
        self.tree=ast.parse(self.source)

    def test_only_expected_read_tools_are_exposed(self):
        names=[]
        for node in self.tree.body:
            if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
                if any(
                    isinstance(dec,ast.Call)
                    and isinstance(dec.func,ast.Attribute)
                    and dec.func.attr=="tool"
                    for dec in node.decorator_list
                ):
                    names.append(node.name)
        self.assertEqual(set(names),{
            "maison_brain_status",
            "maison_ocean_search",
            "maison_osiris_search",
            "maison_semantic_search",
        })
        self.assertTrue(all("write" not in name and "send" not in name and "publish" not in name for name in names))

    def test_all_tools_use_read_only_annotations(self):
        decorated=re.findall(r"@mcp\.tool\(([^)]*)\)",self.source)
        self.assertEqual(len(decorated),4)
        self.assertTrue(all("annotations=READ_ONLY" in x for x in decorated))
        self.assertIn("readOnlyHint=True",self.source)
        self.assertIn("destructiveHint=False",self.source)

    def test_server_has_no_commercial_write_calls(self):
        forbidden=(
            "requests.post(",
            "create-checkout",
            "checkout_write",
            "price_write",
            "catalogue_write",
            "send_email(",
            "send_dm(",
            "INSERT INTO ",
            "UPDATE ",
            "DELETE FROM ",
        )
        lowered=self.source.lower()
        for token in forbidden:
            self.assertNotIn(token.lower(),lowered)

    def test_transport_is_private_by_compose_contract(self):
        compose=(ROOT/"docker-compose.observe.yml").read_text(encoding="utf-8")
        self.assertIn("brain-mcp:",compose)
        self.assertIn('"127.0.0.1:${BRAIN_MCP_HOST_PORT:-8792}:8792"',compose)


if __name__=="__main__":
    unittest.main(verbosity=2)
