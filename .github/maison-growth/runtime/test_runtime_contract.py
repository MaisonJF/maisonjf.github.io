#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent


class RuntimeContractTests(unittest.TestCase):
    def test_repository_stage_is_infra_only(self):
        p=json.loads((ROOT/"observe-only-policy.json").read_text())
        self.assertEqual(p["current_stage"],"infra_only")

    def test_activation_planner_has_no_side_effects(self):
        out=subprocess.check_output(
            [sys.executable,str(ROOT/"plan_observe_activation.py"),"keyless_observe_candidate"],
            text=True,
        )
        plan=json.loads(out)
        self.assertTrue(plan["changes_only_not_applied"])
        self.assertTrue(plan["WORKER_ENABLED"]=="true")
        self.assertFalse(plan["outbound_authorized"])
        self.assertFalse(plan["spend_authorized"])
        self.assertFalse(plan["public_write_authorized"])

    def test_memory_stage_requires_https_smoke(self):
        out=subprocess.check_output(
            [sys.executable,str(ROOT/"plan_observe_activation.py"),"memory_mirror_candidate"],
            text=True,
        )
        plan=json.loads(out)
        self.assertTrue(plan["requires_https_bridge_smoke_test"])


if __name__=="__main__":
    unittest.main(verbosity=2)
