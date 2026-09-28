#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from private_runtime_tokens import (
    PrivateRuntimeTokenError,
    derive_private_token,
    resolve_private_runtime_tokens,
    write_github_env,
)


class PrivateRuntimeTokenTests(unittest.TestCase):
    def test_derives_distinct_deterministic_scoped_tokens(self):
        root = "root-secret-value-abcdefghijklmnopqrstuvwxyz"
        proposal_a = derive_private_token(root, "proposal")
        proposal_b = derive_private_token(root, "proposal")
        review = derive_private_token(root, "review")
        self.assertEqual(proposal_a, proposal_b)
        self.assertNotEqual(proposal_a, review)
        self.assertNotEqual(root, proposal_a)
        self.assertNotEqual(root, review)

    def test_resolver_needs_only_control_root(self):
        tokens = resolve_private_runtime_tokens({
            "MAISON_BRAIN_CONTROL_TOKEN": "root-secret-value-abcdefghijklmnopqrstuvwxyz",
        })
        self.assertEqual(
            set(tokens),
            {"BRAIN_CONTROL_TOKEN", "BRAIN_PROPOSAL_TOKEN", "BRAIN_REVIEW_DECISION_TOKEN"},
        )
        self.assertEqual(len(set(tokens.values())), 3)

    def test_explicit_scoped_overrides_remain_supported(self):
        tokens = resolve_private_runtime_tokens({
            "MAISON_BRAIN_CONTROL_TOKEN": "root-secret-value-abcdefghijklmnopqrstuvwxyz",
            "MAISON_BRAIN_PROPOSAL_TOKEN": "proposal-explicit-abcdefghijklmnopqrstuvwxyz",
            "MAISON_BRAIN_REVIEW_DECISION_TOKEN": "review-explicit-abcdefghijklmnopqrstuvwxyz",
        })
        self.assertEqual(tokens["BRAIN_PROPOSAL_TOKEN"], "proposal-explicit-abcdefghijklmnopqrstuvwxyz")
        self.assertEqual(tokens["BRAIN_REVIEW_DECISION_TOKEN"], "review-explicit-abcdefghijklmnopqrstuvwxyz")

    def test_rejects_short_root(self):
        with self.assertRaisesRegex(PrivateRuntimeTokenError, "too_short"):
            resolve_private_runtime_tokens({"MAISON_BRAIN_CONTROL_TOKEN": "short"})

    def test_github_env_contains_only_derived_scoped_tokens(self):
        root = "root-secret-value-abcdefghijklmnopqrstuvwxyz"
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "github-env"
            path.touch()
            write_github_env({"MAISON_BRAIN_CONTROL_TOKEN": root}, path)
            text = path.read_text(encoding="utf-8")
        self.assertIn("BRAIN_PROPOSAL_TOKEN=", text)
        self.assertIn("BRAIN_REVIEW_DECISION_TOKEN=", text)
        self.assertNotIn("BRAIN_CONTROL_TOKEN=", text)
        self.assertNotIn(root, text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
