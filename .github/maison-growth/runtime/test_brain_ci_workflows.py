#!/usr/bin/env python3
from __future__ import annotations

import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parent
WORKFLOWS=ROOT.parents[1]/"workflows"


class BrainCiWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guard=(WORKFLOWS/"maison-brain-guard.yml").read_text(encoding="utf-8")
        cls.preview=(WORKFLOWS/"maison-private-commercial-preview.yml").read_text(encoding="utf-8")

    def test_brain_guard_validates_relevant_main_pushes(self):
        self.assertIn("  push:\n",self.guard)
        self.assertIn("      - main\n",self.guard)
        self.assertIn(
            "bash .github/maison-growth/brain/rebuild_commercial_context.sh --check",
            self.guard,
        )

    def test_private_commercial_preview_is_manual_only(self):
        self.assertIn("  workflow_dispatch:\n",self.preview)
        self.assertNotIn("  pull_request:\n",self.preview)
        self.assertNotIn("  push:\n",self.preview)

    def test_private_commercial_preview_cannot_materialize(self):
        self.assertIn("MAISON_A14_MATERIALIZE_ENABLED: 'false'",self.preview)
        self.assertNotIn("MAISON_BRAIN_PROPOSAL_TOKEN",self.preview)
        self.assertNotIn("MAISON_BRAIN_REVIEW_DECISION_TOKEN",self.preview)
        self.assertNotIn("BRAIN_PROPOSAL",self.preview)
        self.assertNotIn("wrangler deploy",self.preview.lower())
        self.assertNotIn("wrangler secret put",self.preview.lower())
        self.assertIn("private_commercial_preview.py",self.preview)

    def test_preview_disables_memory_backends_for_first_read_smoke(self):
        self.assertIn("MAISON_SEMANTIC_CONTEXT_ENABLED: 'false'",self.preview)
        self.assertIn("MAISON_OSIRIS_CONTEXT_ENABLED: 'false'",self.preview)


if __name__=="__main__":
    unittest.main(verbosity=2)
