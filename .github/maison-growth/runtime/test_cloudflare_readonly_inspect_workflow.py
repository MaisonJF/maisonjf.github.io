#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORKFLOW = ROOT.parents[1] / "workflows" / "maison-cloudflare-readonly-inspect.yml"


class CloudflareReadonlyInspectWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_workflow_is_manual_only(self):
        self.assertIn("workflow_dispatch:", self.source)
        self.assertNotIn("pull_request:", self.source)
        self.assertNotIn("push:", self.source)

    def test_workflow_uses_only_cloudflare_read_credentials(self):
        self.assertIn("${{ secrets.CLOUDFLARE_API_TOKEN }}", self.source)
        self.assertIn("${{ secrets.CLOUDFLARE_ACCOUNT_ID }}", self.source)
        for forbidden_secret in (
            "MAISON_BRAIN_CONTROL_TOKEN",
            "MAISON_BRAIN_PROPOSAL_TOKEN",
            "MAISON_BRAIN_REVIEW_DECISION_TOKEN",
            "MAISON_BRAIN_PRIVATE_URL",
        ):
            self.assertNotIn(forbidden_secret, self.source)

    def test_workflow_runs_read_only_migration_inspector(self):
        self.assertIn(
            "bash scripts/inspect-growth-migrations.sh maison-growth-engine",
            self.source,
        )

    def test_workflow_contains_no_deploy_secret_put_or_d1_write_command(self):
        lowered = self.source.lower()
        for forbidden in (
            "wrangler deploy",
            "wrangler secret put",
            "apply-growth-migrations.sh",
            "update external_intelligence_control",
            "insert into ",
            "delete from ",
            "alter table ",
            "drop table ",
        ):
            self.assertNotIn(forbidden, lowered)


if __name__ == "__main__":
    unittest.main(verbosity=2)
