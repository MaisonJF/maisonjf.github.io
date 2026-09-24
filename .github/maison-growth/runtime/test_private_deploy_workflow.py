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

    def test_runtime_changes_get_automatic_secret_free_dry_run(self):
        self.assertIn("  pull_request:\n", self.source)
        self.assertIn("  push:\n", self.source)
        self.assertIn("      - main\n", self.source)
        self.assertIn(
            "RUNTIME_STAGE: ${{ github.event_name == 'workflow_dispatch' && inputs.stage || 'private_brain_read_candidate' }}",
            self.source,
        )

    def test_job_environment_contains_no_repository_secrets(self):
        job_header = self.source.split("    steps:", 1)[0]
        self.assertNotIn("${{ secrets.", job_header)

    def test_readiness_report_only_runs_on_trusted_main_pushes(self):
        block = """      - name: Report first-stage credential readiness
        if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
"""
        self.assertIn(block, self.source)
        start = self.source.index("- name: Report first-stage credential readiness")
        guard = self.source.index("- name: Guard live apply")
        report_block = self.source[start:guard]
        self.assertIn("report_private_runtime_readiness.py", report_block)
        self.assertIn("${{ secrets.CLOUDFLARE_API_TOKEN }}", report_block)
        self.assertIn("${{ secrets.MAISON_BRAIN_CONTROL_TOKEN }}", report_block)

    def test_live_preflight_never_runs_on_automatic_events(self):
        block = """      - name: Private-stage preflight
        if: ${{ github.event_name == 'workflow_dispatch' && inputs.apply }}
"""
        self.assertIn(block, self.source)

    def test_dry_run_renderer_has_no_private_url_secret(self):
        start = self.source.index("- name: Render temporary Wrangler config (dry-run)")
        end = self.source.index("- name: Render temporary Wrangler config (live custom domain)")
        block = self.source[start:end]
        self.assertIn("github.event_name != 'workflow_dispatch' || !inputs.apply", block)
        self.assertNotIn("MAISON_BRAIN_PRIVATE_URL", block)
        self.assertNotIn("--private-url", block)

    def test_live_renderer_binds_configured_private_custom_domain(self):
        start = self.source.index("- name: Render temporary Wrangler config (live custom domain)")
        end = self.source.index("- name: Install Worker tooling")
        block = self.source[start:end]
        self.assertIn("github.event_name == 'workflow_dispatch' && inputs.apply", block)
        self.assertIn("BRAIN_CONTROL_API_URL: ${{ secrets.MAISON_BRAIN_PRIVATE_URL }}", block)
        self.assertIn('--private-url "$BRAIN_CONTROL_API_URL"', block)

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

    def test_live_apply_verifies_private_boundary_after_health(self):
        health = self.source.index("- name: Verify deployed private Brain health")
        boundary = self.source.index("- name: Verify deployed private Brain boundary")
        self.assertLess(health, boundary)
        block = self.source[boundary:boundary + 650]
        self.assertIn('verify_private_brain_boundary.py "$RUNTIME_STAGE"', block)
        self.assertIn("MAISON_BRAIN_PRIVATE_URL", block)
        self.assertIn("MAISON_BRAIN_CONTROL_TOKEN", block)

    def test_live_steps_require_manual_dispatch_and_apply(self):
        condition = "if: ${{ github.event_name == 'workflow_dispatch' && inputs.apply }}"
        for step in (
            "Guard live apply",
            "Private-stage preflight",
            "Verify remote D1 schema",
            "Install private Worker secrets",
            "Deploy private surface",
            "Verify deployed private Brain health",
            "Verify deployed private Brain boundary",
        ):
            start = self.source.index(f"- name: {step}")
            tail = self.source[start:start + 350]
            self.assertIn(condition, tail, step)


if __name__ == "__main__":
    unittest.main(verbosity=2)
