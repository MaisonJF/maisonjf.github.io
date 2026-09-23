#!/usr/bin/env python3
from __future__ import annotations

import json
import unittest

from private_commercial_preview import safe_summary


class PrivateCommercialPreviewTests(unittest.TestCase):
    def test_safe_summary_keeps_counts_and_drops_identifiers(self):
        report={
            "mode":"preview_only",
            "observe":{"feed_rows":5,"packets":2,"a14_previews":1},
            "selected_previews":1,
            "selected_for_human_review":1,
            "selected_analysis_only":0,
            "writes_performed":False,
            "inbox_before":{
                "counts":{"decide":1,"manual_pilots":0,"a8_drafts":0,"total":1},
                "decide":[{"queue_id":"secret-internal-id","opportunity_id":"opp_secret"}],
            },
            "inbox_after":{
                "counts":{"decide":1,"manual_pilots":0,"a8_drafts":0,"total":1},
                "decide":[{"queue_id":"secret-internal-id","opportunity_id":"opp_secret"}],
            },
            "authority":{"public_write_authorized":False},
        }
        summary=safe_summary(report)
        rendered=json.dumps(summary)
        self.assertEqual(summary["selected_previews"],1)
        self.assertEqual(summary["inbox_before_counts"]["total"],1)
        self.assertFalse(summary["writes_performed"])
        self.assertFalse(any(summary["authority"].values()))
        self.assertFalse(summary["identifiers_printed"])
        self.assertNotIn("secret-internal-id",rendered)
        self.assertNotIn("opp_secret",rendered)


if __name__=="__main__":
    unittest.main(verbosity=2)
