#!/usr/bin/env python3
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPTS = ROOT.parents[2] / "workers" / "maison-intelligence" / "scripts"
VERIFY = SCRIPTS / "verify-growth-schema.sh"
INSPECT = SCRIPTS / "inspect-growth-migrations.sh"
APPLY = SCRIPTS / "apply-growth-migrations.sh"

FORBIDDEN_WRITES = (
    "INSERT ",
    "UPDATE ",
    "DELETE ",
    "ALTER ",
    "CREATE ",
    "DROP ",
    "REPLACE ",
)


class RemoteSchemaGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = VERIFY.read_text(encoding="utf-8")
        cls.inspect = INSPECT.read_text(encoding="utf-8")
        cls.apply = APPLY.read_text(encoding="utf-8")

    def test_gate_is_read_only(self):
        upper = self.source.upper()
        for forbidden in FORBIDDEN_WRITES:
            self.assertNotIn(forbidden, upper)
        self.assertIn("LIMIT 0", upper)

    def test_gate_checks_latest_commercial_surfaces(self):
        for name in (
            "brain_prebrain_feed",
            "brain_cash_feedback",
            "brain_b2b_feedback",
            "autonomy_human_queue_current",
            "a14_approved_offers_ready_for_planning",
            "a14_validation_plans",
            "a14_validation_plan_a8_links",
        ):
            self.assertRegex(self.source, rf"\b{re.escape(name)}\b")

    def test_gate_uses_remote_d1(self):
        self.assertIn("wrangler d1 execute", self.source)
        self.assertIn("--remote", self.source)

    def test_migration_inspector_is_read_only_and_remote(self):
        upper = self.inspect.upper()
        for forbidden in FORBIDDEN_WRITES:
            self.assertNotIn(forbidden, upper)
        self.assertIn("sqlite_master", self.inspect)
        self.assertIn("wrangler d1 execute", self.inspect)
        self.assertIn("--remote", self.inspect)

    def test_migration_inspector_covers_complete_0001_to_0019_chain(self):
        found = re.findall(r"'(00\d{2}_[a-z0-9_]+)'", self.inspect)
        migrations = [item.split("_", 1)[0] for item in found]
        unique_migrations = sorted(set(migrations))
        self.assertEqual(
            unique_migrations,
            [f"{number:04d}" for number in range(1, 20)],
        )
        self.assertIn("missing_or_partial", self.inspect)
        self.assertIn("maison-b2b", self.inspect)

    def test_full_apply_orders_0017_before_0018(self):
        self.assertIn("0017_b2b_canonical_solution.sql", self.apply)
        self.assertIn("0018_b2b_feedback.sql", self.apply)
        self.assertLess(
            self.apply.index("0017_b2b_canonical_solution.sql"),
            self.apply.index("0018_b2b_feedback.sql"),
        )

    def test_full_apply_orders_0019_after_0018(self):
        self.assertIn("0019_content_learning_source.sql", self.apply)
        self.assertLess(
            self.apply.index("0018_b2b_feedback.sql"),
            self.apply.index("0019_content_learning_source.sql"),
        )
        self.assertIn("A11.2", self.source)

    def test_runtime_helpers_default_to_canonical_growth_database(self):
        self.assertIn('DB_NAME="${1:-maison-growth-engine}"', self.inspect)
        self.assertIn('DB_NAME="${1:-maison-growth-engine}"', self.apply)
        self.assertNotIn('DB_NAME="${1:-maison-growth}"', self.apply)

    def test_full_migration_helper_requires_explicit_fresh_confirmation(self):
        self.assertIn('CONFIRM="${2:-}"', self.apply)
        self.assertIn('[[ "$CONFIRM" != "--confirm-fresh" ]]', self.apply)
        self.assertIn("Refusing to apply the full migration chain", self.apply)
        self.assertIn("exit 2", self.apply)


if __name__ == "__main__":
    unittest.main(verbosity=2)
