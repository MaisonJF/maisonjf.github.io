#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORKER = ROOT.parents[2] / "workers" / "maison-intelligence"
sys.path.insert(0, str(ROOT))

from render_private_worker_config import render_private_worker_config


class RenderPrivateWorkerConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.template = json.loads(
            (WORKER / "wrangler.template.jsonc").read_text(encoding="utf-8")
        )
        cls.database_id = "0123456789abcdef0123456789abcdef"

    def test_private_read_only_enables_control_api_only(self):
        cfg = render_private_worker_config(
            stage_name="private_brain_read_candidate",
            template=self.template,
            database_id=self.database_id,
        )
        vars_ = cfg["vars"]
        self.assertEqual(vars_["BRAIN_CONTROL_API_ENABLED"], "true")
        self.assertEqual(vars_["BRAIN_PROPOSAL_API_ENABLED"], "false")
        self.assertEqual(vars_["BRAIN_REVIEW_DECISION_ENABLED"], "false")
        self.assertEqual(vars_["WORKER_ENABLED"], "false")
        self.assertEqual(vars_["KILL_SWITCH"], "true")
        self.assertEqual(vars_["OSIRIS_ENABLED"], "false")
        self.assertEqual(vars_["PUBLIC_DATA_ENABLED"], "false")

    def test_proposal_stage_adds_only_proposal_surface(self):
        cfg = render_private_worker_config(
            stage_name="proposal_materialization_candidate",
            template=self.template,
            database_id=self.database_id,
        )
        vars_ = cfg["vars"]
        self.assertEqual(vars_["BRAIN_CONTROL_API_ENABLED"], "true")
        self.assertEqual(vars_["BRAIN_PROPOSAL_API_ENABLED"], "true")
        self.assertEqual(vars_["BRAIN_REVIEW_DECISION_ENABLED"], "false")
        self.assertEqual(vars_["WORKER_ENABLED"], "false")

    def test_human_review_stage_keeps_collection_off(self):
        cfg = render_private_worker_config(
            stage_name="human_review_decision_candidate",
            template=self.template,
            database_id=self.database_id,
        )
        vars_ = cfg["vars"]
        self.assertEqual(vars_["BRAIN_REVIEW_DECISION_ENABLED"], "true")
        self.assertEqual(vars_["WORKER_ENABLED"], "false")
        self.assertEqual(vars_["KILL_SWITCH"], "true")
        self.assertEqual(vars_["OPENROUTER_ENABLED"], "false")
        self.assertEqual(vars_["OSIRIS_GATEWAY_ENABLED"], "false")

    def test_placeholder_database_id_is_refused(self):
        with self.assertRaisesRegex(ValueError, "valid_d1_database_id_required"):
            render_private_worker_config(
                stage_name="private_brain_read_candidate",
                template=self.template,
                database_id="REPLACE_WITH_D1_DATABASE_ID",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
