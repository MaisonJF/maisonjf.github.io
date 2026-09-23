#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from commercial_action_cli import summarize


class CommercialActionCliTests(unittest.TestCase):
    def test_manual_pilot_summary_keeps_prerequisites_and_drops_unknown_fields(self):
        payload={
            "decide":[],
            "manual_pilots":[{
                "validation_plan_id":"vpl_1",
                "opportunity_id":"opp_1",
                "offer_hypothesis_id":"ofh_1",
                "plan_kind":"manual_physical_pilot",
                "validation_mode":"micro_batch",
                "primary_metric_key":None,
                "reason_codes":[
                    "manual_pilot_requires_verified_stock",
                    "manual_pilot_requires_verified_unit_cost",
                ],
                "private_note":"must-not-leak",
            }],
            "a8_drafts":[],
            "authority":{
                "public_write_authorized":False,
                "outbound_authorized":False,
                "spend_authorized":False,
                "experiment_execution_authorized":False,
            },
        }
        result=summarize(payload)
        pilot=result["manual_pilots"][0]
        self.assertIn("manual_pilot_requires_verified_stock",pilot["reason_codes"])
        self.assertIn("manual_pilot_requires_verified_unit_cost",pilot["reason_codes"])
        self.assertNotIn("private_note",json.dumps(result))
        self.assertFalse(result["writes_performed"])


if __name__=="__main__":
    unittest.main(verbosity=2)
