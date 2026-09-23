#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parent


class PrivateCommercialHygieneTests(unittest.TestCase):
    def test_private_operator_patterns_are_ignored(self):
        source=(ROOT/".gitignore").read_text(encoding="utf-8")
        self.assertIn("*.private.json",source)
        self.assertIn("*.private.env",source)
        self.assertIn("private-overlays/",source)

    def test_no_private_operator_files_are_tracked(self):
        repo=ROOT.parents[2]
        output=subprocess.check_output(
            ["git","ls-files",".github/maison-growth/brain"],
            cwd=repo,
            text=True,
        )
        tracked=tuple(line.strip() for line in output.splitlines() if line.strip())
        forbidden=[
            path for path in tracked
            if path.endswith(".private.json")
            or path.endswith(".private.env")
            or "/private-overlays/" in path
        ]
        self.assertEqual(forbidden,[])


if __name__=="__main__":
    unittest.main(verbosity=2)
