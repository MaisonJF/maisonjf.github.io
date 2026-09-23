#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from report_private_runtime_readiness import summarize


class PrivateRuntimeReadinessTests(unittest.TestCase):
    def test_reports_names_only_and_never_secret_values(self):
        values = {
            "CLOUDFLARE_API_TOKEN": "token-secret-value-abcdefghijklmnopqrstuvwxyz",
            "CLOUDFLARE_ACCOUNT_ID": "account-secret-value",
            "MAISON_BRAIN_PRIVATE_URL": "https://brain.private.test",
            "MAISON_BRAIN_CONTROL_TOKEN": "brain-secret-value-abcdefghijklmnopqrstuvwxyz",
            "MAISON_CF_ACCESS_CLIENT_ID": "access-id-secret",
            "MAISON_CF_ACCESS_CLIENT_SECRET": "access-secret-value",
        }
        result = summarize(values)
        rendered = json.dumps(result)
        for secret in values.values():
            self.assertNotIn(secret, rendered)
        self.assertTrue(result["first_stage_credentials_present"])
        self.assertTrue(result["read_only_inspection_credentials_present"])
        self.assertEqual(result["read_only_inspection_token_source"],"deployment_fallback")
        self.assertTrue(result["access_boundary_pair_present"])
        self.assertFalse(result["access_boundary_pair_partial"])
        self.assertFalse(result["secrets_printed"])

    def test_missing_first_stage_inputs_do_not_fail_the_report(self):
        result = summarize({})
        self.assertFalse(result["first_stage_credentials_present"])
        self.assertEqual(
            set(result["first_stage_missing"]),
            {
                "CLOUDFLARE_API_TOKEN",
                "CLOUDFLARE_ACCOUNT_ID",
                "MAISON_BRAIN_PRIVATE_URL",
                "MAISON_BRAIN_CONTROL_TOKEN",
            },
        )
        self.assertFalse(result["read_only_inspection_credentials_present"])
        self.assertEqual(result["read_only_inspection_token_source"],"missing")
        self.assertFalse(result["access_boundary_pair_present"])
        self.assertFalse(result["access_boundary_pair_partial"])

    def test_dedicated_read_token_can_make_inspection_ready_without_live_deploy_token(self):
        values={
            "CLOUDFLARE_READ_API_TOKEN":"read-token-secret",
            "CLOUDFLARE_ACCOUNT_ID":"account-id-secret",
        }
        result=summarize(values)
        self.assertFalse(result["first_stage_credentials_present"])
        self.assertTrue(result["read_only_inspection_credentials_present"])
        self.assertEqual(result["read_only_inspection_token_source"],"dedicated_read")
        rendered=json.dumps(result)
        self.assertNotIn("read-token-secret",rendered)
        self.assertNotIn("account-id-secret",rendered)

    def test_partial_access_pair_is_visible_without_values(self):
        result = summarize({"MAISON_CF_ACCESS_CLIENT_ID": "configured-but-secret"})
        self.assertFalse(result["access_boundary_pair_present"])
        self.assertTrue(result["access_boundary_pair_partial"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
