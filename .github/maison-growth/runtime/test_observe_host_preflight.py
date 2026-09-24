#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from preflight_observe_host import validate_base_env


class ObserveHostPreflightTests(unittest.TestCase):
    def test_valid_base_env_reports_names_only(self):
        values={
            "POSTGRES_PASSWORD":"postgres-secret-value-abcdefghijklmnopqrstuvwxyz",
            "MAISON_OSIRIS_BRIDGE_TOKEN":"bridge-secret-value-abcdefghijklmnopqrstuvwxyz",
            "POSTGRES_PORT":"55432",
            "REDIS_PORT":"56379",
            "OSIRIS_MCP_PORT":"58790",
            "MAISON_OSIRIS_BRIDGE_PORT":"58791",
            "BRAIN_MCP_HOST_PORT":"58792",
        }
        result=validate_base_env(values)
        self.assertTrue(result["ready"])
        self.assertEqual(result["errors"],[])
        self.assertFalse(result["secret_values_printed"])
        rendered=json.dumps(result)
        for value in (
            values["POSTGRES_PASSWORD"],
            values["MAISON_OSIRIS_BRIDGE_TOKEN"],
        ):
            self.assertNotIn(value,rendered)

    def test_placeholders_block_host_preflight(self):
        result=validate_base_env({
            "POSTGRES_PASSWORD":"CHANGE_ME_LONG_RANDOM",
            "MAISON_OSIRIS_BRIDGE_TOKEN":"REPLACE_WITH_TOKEN",
        })
        self.assertFalse(result["ready"])
        self.assertIn("POSTGRES_PASSWORD:placeholder",result["errors"])
        self.assertIn("MAISON_OSIRIS_BRIDGE_TOKEN:placeholder",result["errors"])

    def test_base_secrets_must_be_distinct(self):
        secret="same-secret-value-abcdefghijklmnopqrstuvwxyz"
        result=validate_base_env({
            "POSTGRES_PASSWORD":secret,
            "MAISON_OSIRIS_BRIDGE_TOKEN":secret,
        })
        self.assertFalse(result["ready"])
        self.assertIn("base_secrets_must_be_distinct",result["errors"])

    def test_host_port_collisions_are_blocked(self):
        result=validate_base_env({
            "POSTGRES_PASSWORD":"postgres-secret-value-abcdefghijklmnopqrstuvwxyz",
            "MAISON_OSIRIS_BRIDGE_TOKEN":"bridge-secret-value-abcdefghijklmnopqrstuvwxyz",
            "POSTGRES_PORT":"5432",
            "REDIS_PORT":"5432",
        })
        self.assertFalse(result["ready"])
        self.assertTrue(
            any(item.startswith("host_port_collision:") for item in result["errors"])
        )

    def test_invalid_ports_are_blocked(self):
        result=validate_base_env({
            "POSTGRES_PASSWORD":"postgres-secret-value-abcdefghijklmnopqrstuvwxyz",
            "MAISON_OSIRIS_BRIDGE_TOKEN":"bridge-secret-value-abcdefghijklmnopqrstuvwxyz",
            "OSIRIS_MCP_PORT":"70000",
        })
        self.assertFalse(result["ready"])
        self.assertIn("OSIRIS_MCP_PORT:invalid_port",result["errors"])


if __name__=="__main__":
    unittest.main(verbosity=2)
