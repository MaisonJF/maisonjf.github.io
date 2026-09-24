#!/usr/bin/env python3
from __future__ import annotations
import unittest
from precloud_operator_checklist import build_checklist

class ChecklistTests(unittest.TestCase):
    def test_prioritizes_assets_and_counts_blockers_without_granting_authority(self):
        result=build_checklist({
            "kind":"maison_commercial_operator_readiness",
            "overlay_loaded":True,
            "attention":[
                {"asset_ref":"a2","name":"Second","asset_type":"product","attention_rank":2,"blockers":["inventory_quantity","unit_cost"]},
                {"asset_ref":"a1","name":"First","asset_type":"service","attention_rank":1,"blockers":["capacity"]},
                {"asset_ref":"a3","name":"Ready","asset_type":"service","attention_rank":3,"blockers":[]},
            ],
            "bundles":[{"bundle_id":"b1","label":"Bundle","blockers":["component_cost"]}],
        })
        self.assertEqual([x["asset_ref"] for x in result["assets_to_review"]],["a1","a2"])
        self.assertEqual(result["summary"]["assets_with_missing_facts"],2)
        self.assertEqual(result["summary"]["bundles_with_missing_facts"],1)
        self.assertFalse(result["authority"]["public_write_authorized"])
        self.assertFalse(result["authority"]["discount_authorized"])
        self.assertFalse(result["authority"]["experiment_execution_authorized"])

if __name__=="__main__":
    unittest.main(verbosity=2)
