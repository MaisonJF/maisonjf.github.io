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

    def test_manual_activation_is_one_button(self):
        self.assertIn("  workflow_dispatch:\n", self.source)
        self.assertNotIn("    inputs:", self.source)
        self.assertIn("RUNTIME_STAGE: human_review_decision_candidate", self.source)

    def test_runtime_changes_still_get_secret_free_dry_run(self):
        self.assertIn("  pull_request:\n", self.source)
        self.assertIn("  push:\n", self.source)
        self.assertIn("      - main\n", self.source)
        job_header = self.source.split("    steps:", 1)[0]
        self.assertNotIn("${{ secrets.", job_header)

    def test_readiness_report_only_runs_on_trusted_main_pushes(self):
        block = """      - name: Report private runtime readiness
        if: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
"""
        self.assertIn(block, self.source)
        self.assertIn("report_private_runtime_readiness.py", self.source)

    def test_manual_activation_requires_cloudflare_access_credentials(self):
        start = self.source.index("- name: Guard manual private activation")
        end = self.source.index("- name: Prepare scoped private credentials")
        block = self.source[start:end]
        self.assertIn("test -n \"$CF_ACCESS_CLIENT_ID\"", block)
        self.assertIn("test -n \"$CF_ACCESS_CLIENT_SECRET\"", block)
        self.assertIn("test -n \"$BRAIN_CONTROL_TOKEN\"", block)

    def test_scoped_tokens_are_derived_from_single_root_secret(self):
        start = self.source.index("- name: Prepare scoped private credentials")
        end = self.source.index("- name: Private runtime preflight")
        block = self.source[start:end]
        self.assertIn("private_runtime_tokens.py --github-env", block)
        self.assertIn("MAISON_BRAIN_CONTROL_TOKEN", block)
        self.assertNotIn("MAISON_BRAIN_PROPOSAL_TOKEN", block)
        self.assertNotIn("MAISON_BRAIN_REVIEW_DECISION_TOKEN", block)

    def test_live_preflight_never_runs_on_automatic_events(self):
        block = """      - name: Private runtime preflight
        if: ${{ github.event_name == 'workflow_dispatch' }}
"""
        self.assertIn(block, self.source)

    def test_dry_run_renderer_has_no_private_url_secret(self):
        start = self.source.index("- name: Render temporary Wrangler config (dry-run)")
        end = self.source.index("- name: Render temporary Wrangler config (live custom domain)")
        block = self.source[start:end]
        self.assertIn("github.event_name != 'workflow_dispatch'", block)
        self.assertNotIn("MAISON_BRAIN_PRIVATE_URL", block)
        self.assertNotIn("--private-url", block)

    def test_live_renderer_binds_configured_private_custom_domain(self):
        start = self.source.index("- name: Render temporary Wrangler config (live custom domain)")
        end = self.source.index("- name: Install Worker tooling")
        block = self.source[start:end]
        self.assertIn("github.event_name == 'workflow_dispatch'", block)
        self.assertIn("BRAIN_CONTROL_API_URL: ${{ secrets.MAISON_BRAIN_PRIVATE_URL }}", block)
        self.assertIn('--private-url "$BRAIN_CONTROL_API_URL"', block)

    def test_live_apply_checks_schema_before_deploy(self):
        schema = self.source.index("- name: Verify remote D1 schema")
        deploy = self.source.index("- name: Deploy complete private surface")
        self.assertLess(schema, deploy)
        self.assertIn("verify-growth-schema.sh maison-growth-engine", self.source)

    def test_live_deploys_code_and_all_private_tokens_together(self):
        deploy = self.source.index("- name: Deploy complete private surface")
        verify = self.source.index("- name: Verify Worker deployment exists")
        block = self.source[deploy:verify]
        self.assertIn('--secrets-file "$secrets_file"', block)
        self.assertIn('"BRAIN_CONTROL_TOKEN"', block)
        self.assertIn('"BRAIN_PROPOSAL_TOKEN"', block)
        self.assertIn('"BRAIN_REVIEW_DECISION_TOKEN"', block)
        self.assertNotIn("wrangler secret put", block)

    def test_live_verification_has_propagation_retries_and_preview(self):
        self.assertIn("for attempt in $(seq 1 12)", self.source)
        self.assertIn("for attempt in $(seq 1 8)", self.source)
        self.assertIn('verify_private_brain_boundary.py "$RUNTIME_STAGE"', self.source)
        self.assertIn("- name: Run private commercial preview", self.source)
        self.assertIn("private_commercial_preview.py", self.source)

    def test_all_mutating_live_steps_are_manual_only(self):
        condition = "if: ${{ github.event_name == 'workflow_dispatch' }}"
        for step in (
            "Guard manual private activation",
            "Prepare scoped private credentials",
            "Private runtime preflight",
            "Verify remote D1 schema",
            "Deploy complete private surface",
            "Verify Worker deployment exists",
            "Verify deployed private Brain health",
            "Verify two-layer private boundary",
            "Run private commercial preview",
        ):
            start = self.source.index(f"- name: {step}")
            tail = self.source[start:start + 420]
            self.assertIn(condition, tail, step)

    def test_video_smoke_is_not_coupled_to_brain_deploy(self):
        for forbidden in (
            "VIDEO_GENERATION_TOKEN",
            "Verify video generation health",
            "Generate one-second video smoke test",
            "Collect one-second video result",
            "casos-cinzentos-video-smoke-test",
        ):
            self.assertNotIn(forbidden, self.source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
