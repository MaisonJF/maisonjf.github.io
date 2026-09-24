#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parent
SCRIPT=ROOT/"rebuild_commercial_context.sh"


class RebuildCommercialContextTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=SCRIPT.read_text(encoding="utf-8")

    def test_write_order_updates_oceans_before_catalogue_and_rankings(self):
        expected=[
            'build_vpc_ocean_signals.mjs"',
            'build_editorial_queue.mjs"',
            'build_commercial_assets.mjs"',
            'build_digital_experience_coverage.mjs"',
            'build_commercial_bundles.py"',
            'build_commercial_attention.py"',
        ]
        positions=[self.source.index(token) for token in expected]
        self.assertEqual(positions,sorted(positions))

    def test_check_mode_checks_every_derived_projection(self):
        check_block=self.source.split("  --check)",1)[1].split("  *)",1)[0]
        for name in (
            "build_vpc_ocean_signals.mjs",
            "build_editorial_queue.mjs",
            "build_commercial_assets.mjs",
            "build_digital_experience_coverage.mjs",
            "build_commercial_bundles.py",
            "build_commercial_attention.py",
        ):
            line=next(line for line in check_block.splitlines() if name in line)
            self.assertIn("--check",line)

    def test_script_has_no_deploy_or_write_to_external_systems(self):
        lowered=self.source.lower()
        for forbidden in (
            "wrangler deploy",
            "wrangler d1 execute",
            "curl ",
            "git push",
            "gh pr",
        ):
            self.assertNotIn(forbidden,lowered)


if __name__=="__main__":
    unittest.main(verbosity=2)
