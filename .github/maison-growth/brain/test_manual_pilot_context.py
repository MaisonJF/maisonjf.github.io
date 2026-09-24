#!/usr/bin/env python3
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from manual_pilot_context import ManualPilotContextError, load_manual_pilot_context


PLAN="vpl_"+"1"*36


def write_payload(payload):
    handle=tempfile.NamedTemporaryFile("w",encoding="utf-8",suffix=".private.json",delete=False)
    try:
        json.dump(payload,handle)
        return Path(handle.name)
    finally:
        handle.close()


class ManualPilotContextTests(unittest.TestCase):
    def test_loads_strict_evidence_backed_inputs(self):
        path=write_payload({
            "schema_version":"manual_pilot_context_v1",
            "observed_at":"2026-09-24T05:30:00+01:00",
            "contexts":[{
                "validation_plan_id":PLAN,
                "inputs":{
                    "target_profile":"lojas independentes alinhadas com a marca",
                    "price_or_quote_rule":"orçamento humano por âmbito",
                    "unit_or_project_cost_minor":1200,
                },
                "evidence_refs":["manual:pilot:review:2026-09-24"],
            }],
        })
        try:
            result=load_manual_pilot_context(path)
        finally:
            path.unlink(missing_ok=True)
        self.assertIn(PLAN,result)
        self.assertEqual(result[PLAN]["inputs"]["unit_or_project_cost_minor"],1200)
        self.assertEqual(
            result[PLAN]["evidence_refs"],
            ("manual:pilot:review:2026-09-24",),
        )

    def test_unknown_inputs_are_rejected(self):
        path=write_payload({
            "schema_version":"manual_pilot_context_v1",
            "observed_at":"2026-09-24T05:30:00+01:00",
            "contexts":[{
                "validation_plan_id":PLAN,
                "inputs":{"invented_authority":True},
                "evidence_refs":["manual:pilot:review"],
            }],
        })
        try:
            with self.assertRaisesRegex(
                ManualPilotContextError,
                "manual_pilot_context_unknown_inputs",
            ):
                load_manual_pilot_context(path)
        finally:
            path.unlink(missing_ok=True)

    def test_evidence_is_required(self):
        path=write_payload({
            "schema_version":"manual_pilot_context_v1",
            "observed_at":"2026-09-24T05:30:00+01:00",
            "contexts":[{
                "validation_plan_id":PLAN,
                "inputs":{"target_profile":"perfil"},
                "evidence_refs":[],
            }],
        })
        try:
            with self.assertRaisesRegex(
                ManualPilotContextError,
                "manual_pilot_context_evidence_refs_required",
            ):
                load_manual_pilot_context(path)
        finally:
            path.unlink(missing_ok=True)


if __name__=="__main__":
    unittest.main(verbosity=2)
