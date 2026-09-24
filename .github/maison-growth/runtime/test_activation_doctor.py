#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from activation_doctor import assemble_report, recommend_next_step


def ready_host():
    return {
        "ready": True,
        "errors": [],
        "warnings": [],
        "required_secret_presence": {
            "POSTGRES_PASSWORD": True,
            "MAISON_OSIRIS_BRIDGE_TOKEN": True,
        },
        "ports": {},
        "secret_values_printed": False,
        "services_started": False,
        "remote_changes_performed": False,
    }


class ActivationDoctorTests(unittest.TestCase):
    def test_without_env_file_recommends_preparing_private_env(self):
        result = assemble_report(
            {},
            env_file_present=False,
            host_report=None,
        )
        self.assertEqual(result["recommended_next_step"], "prepare_private_env")
        self.assertFalse(result["remote_changes_performed"])
        self.assertFalse(result["services_started"])

    def test_read_only_credentials_are_enough_for_cloudflare_inspection(self):
        values = {
            "CLOUDFLARE_READ_API_TOKEN": "read-secret-value",
            "CLOUDFLARE_ACCOUNT_ID": "account-id",
        }
        result = assemble_report(
            values,
            env_file_present=True,
            host_report=ready_host(),
        )
        self.assertEqual(
            result["recommended_next_step"],
            "run_cloudflare_read_only_inspect",
        )

    def test_complete_first_stage_advances_to_private_brain_preflight(self):
        values = {
            "CLOUDFLARE_API_TOKEN": "deploy-secret-value",
            "CLOUDFLARE_ACCOUNT_ID": "account-id",
            "MAISON_BRAIN_PRIVATE_URL": "https://brain.example.test",
            "MAISON_BRAIN_CONTROL_TOKEN": "brain-control-secret-value",
        }
        result = assemble_report(
            values,
            env_file_present=True,
            host_report=ready_host(),
        )
        self.assertEqual(
            result["recommended_next_step"],
            "run_private_brain_read_preflight",
        )

    def test_partial_access_pair_is_called_out_before_activation(self):
        credentials = {
            "access_boundary_pair_partial": True,
            "read_only_inspection_credentials_present": True,
            "first_stage_credentials_present": True,
        }
        self.assertEqual(
            recommend_next_step(
                credentials,
                env_file_present=True,
                host_ready=True,
            ),
            "complete_or_remove_partial_access_pair",
        )

    def test_report_never_echoes_secret_values(self):
        secrets = {
            "CLOUDFLARE_API_TOKEN": "deploy-super-secret",
            "CLOUDFLARE_ACCOUNT_ID": "account-id",
            "MAISON_BRAIN_PRIVATE_URL": "https://brain.example.test",
            "MAISON_BRAIN_CONTROL_TOKEN": "brain-super-secret",
            "MAISON_CF_ACCESS_CLIENT_ID": "access-id-secret",
            "MAISON_CF_ACCESS_CLIENT_SECRET": "access-client-super-secret",
        }
        result = assemble_report(
            secrets,
            env_file_present=True,
            host_report=ready_host(),
        )
        rendered = json.dumps(result)
        for name, value in secrets.items():
            if name == "CLOUDFLARE_ACCOUNT_ID":
                continue
            self.assertNotIn(value, rendered)
        self.assertFalse(result["secrets_printed"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
