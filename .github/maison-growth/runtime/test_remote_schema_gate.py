#!/usr/bin/env python3
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT.parents[2] / "workers" / "maison-intelligence" / "scripts" / "verify-growth-schema.sh"


class RemoteSchemaGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SCRIPT.read_text(encoding="utf-8")

    def test_gate_is_read_only(self):
        upper = self.source.upper()
        for forbidden in (
            "INSERT ",
            "UPDATE ",
            "DELETE ",
            "ALTER ",
            "CREATE ",
            "DROP ",
            "REPLACE ",
        ):
            self.assertNotIn(forbidden, upper)
        self.assertIn("LIMIT 0", upper)

    def test_gate_checks_latest_commercial_surfaces(self):
        for name in (
            "brain_prebrain_feed",
            "brain_cash_feedback",
            "autonomy_human_queue_current",
            "a14_approved_offers_ready_for_planning",
            "a14_validation_plans",
            "a14_validation_plan_a8_links",
        ):
            self.assertRegex(self.source, rf"\b{re.escape(name)}\b")

    def test_gate_uses_remote_d1(self):
        self.assertIn("wrangler d1 execute", self.source)
        self.assertIn("--remote", self.source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
