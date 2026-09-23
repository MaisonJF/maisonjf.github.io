#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCRIPT = ROOT / "preflight_private_runtime.py"


def run(stage: str, body: str):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / ".env.observe"
        path.write_text(body, encoding="utf-8")
        env = {"PATH": os.environ.get("PATH", "")}
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), stage, "--env-file", str(path)],
            capture_output=True,
            text=True,
            env=env,
        )
        payload = json.loads(proc.stdout)
        return proc.returncode, payload


VALID_CONTROL = """
BRAIN_CONTROL_API_URL=https://brain.private.test
BRAIN_CONTROL_TOKEN=control_token_abcdefghijklmnopqrstuvwxyz
CF_ACCESS_CLIENT_ID=access-client
CF_ACCESS_CLIENT_SECRET=access-secret
"""


class PrivateRuntimePreflightTests(unittest.TestCase):
    def test_private_read_ready_with_https_and_non_placeholder_token(self):
        code, payload = run("private_brain_read_candidate", VALID_CONTROL)
        self.assertEqual(code, 0)
        self.assertTrue(payload["ready"])
        self.assertEqual(payload["required_switches"]["BRAIN_CONTROL_API_ENABLED"], "true")
        self.assertEqual(payload["required_switches"]["WORKER_ENABLED"], "false")
        self.assertFalse(payload["authority"]["experiment_execution_authorized"])
        self.assertFalse(payload["secrets_printed"])

    def test_placeholder_is_blocked(self):
        code, payload = run(
            "private_brain_read_candidate",
            "BRAIN_CONTROL_API_URL=https://REPLACE_WITH_PRIVATE_WORKER_HOST\n"
            "BRAIN_CONTROL_TOKEN=CHANGE_ME_LONG_RANDOM\n",
        )
        self.assertEqual(code, 2)
        self.assertFalse(payload["ready"])
        self.assertTrue(any("placeholder" in item for item in payload["blockers"]))

    def test_remote_http_is_blocked(self):
        code, payload = run(
            "private_brain_read_candidate",
            "BRAIN_CONTROL_API_URL=http://brain.private.test\n"
            "BRAIN_CONTROL_TOKEN=control_token_abcdefghijklmnopqrstuvwxyz\n",
        )
        self.assertEqual(code, 2)
        self.assertTrue(any("requires_https" in item for item in payload["blockers"]))

    def test_proposal_tokens_must_be_distinct(self):
        shared = "shared_token_abcdefghijklmnopqrstuvwxyz"
        code, payload = run(
            "proposal_materialization_candidate",
            VALID_CONTROL
            + "BRAIN_PROPOSAL_API_URL=https://brain.private.test\n"
            + f"BRAIN_PROPOSAL_TOKEN={shared}\n"
            + f"BRAIN_CONTROL_TOKEN={shared}\n",
        )
        self.assertEqual(code, 2)
        self.assertTrue(any("tokens_must_be_distinct" in item for item in payload["blockers"]))

    def test_proposal_stage_never_grants_execution_authority(self):
        code, payload = run(
            "proposal_materialization_candidate",
            VALID_CONTROL
            + "BRAIN_PROPOSAL_API_URL=https://brain.private.test\n"
            + "BRAIN_PROPOSAL_TOKEN=proposal_token_abcdefghijklmnopqrstuvwxyz\n",
        )
        self.assertEqual(code, 0)
        self.assertTrue(payload["ready"])
        self.assertEqual(payload["required_switches"]["BRAIN_PROPOSAL_API_ENABLED"], "true")
        self.assertFalse(payload["authority"]["public_write_authorized"])
        self.assertFalse(payload["authority"]["outbound_authorized"])
        self.assertFalse(payload["authority"]["spend_authorized"])
        self.assertFalse(payload["authority"]["experiment_execution_authorized"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
