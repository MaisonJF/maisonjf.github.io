#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORKFLOW = ROOT.parents[1] / "workflows" / "maison-private-runtime.yml"


class PrivateDeployWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_dry_run_does_not_require_live_preflight(self):
        block = """      - name: Private-stage preflight
        if: ${{ inputs.apply }}
"""
        self.assertIn(block, self.source)

    def test_renderer_reuses_canonical_worker_binding(self):
        self.assertIn("--template workers/maison-intelligence/wrangler.jsonc", self.source)
        self.assertNotIn("MAISON_GROWTH_D1_DATABASE_ID", self.source)

    def test_live_apply_checks_schema_before_deploy(self):
        schema = self.source.index("- name: Verify remote D1 schema")
        deploy = self.source.index("- name: Deploy private surface")
        self.assertLess(schema, deploy)
        self.assertIn("verify-growth-schema.sh maison-growth-engine", self.source)

    def test_live_apply_verifies_read_only_health_after_deploy(self):
        deploy = self.source.index("- name: Deploy private surface")
        health = self.source.index("- name: Verify deployed private Brain health")
        self.assertLess(deploy, health)
        self.assertIn("verify_private_brain_health.py", self.source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
