#!/usr/bin/env python3
from __future__ import annotations

import unittest

from verify_private_brain_boundary import (
    BoundaryVerificationError,
    HttpResult,
    validate_results,
)


def ok_inbox():
    return HttpResult(200,{
        "authority":{
            "public_write_authorized":False,
            "outbound_authorized":False,
            "spend_authorized":False,
            "experiment_execution_authorized":False,
        }
    })


class PrivateBrainBoundaryTests(unittest.TestCase):
    def test_private_read_stage_requires_denied_unauth_and_hidden_write_surfaces(self):
        result=validate_results(
            stage="private_brain_read_candidate",
            unauth_health=HttpResult(401,{"error":"unauthorized"}),
            auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
            action_inbox=ok_inbox(),
            proposal_probe=HttpResult(404,{"error":"not_found"}),
            review_probe=HttpResult(404,{"error":"not_found"}),
        )
        self.assertEqual(result["status"],"ok")
        self.assertEqual(result["write_surfaces"],"hidden_404")
        self.assertFalse(result["writes_performed"])
        self.assertFalse(result["execution_authority"])

    def test_cloudflare_style_403_is_valid_unauthenticated_denial(self):
        result=validate_results(
            stage="private_brain_read_candidate",
            unauth_health=HttpResult(403,None),
            auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
            action_inbox=ok_inbox(),
            proposal_probe=HttpResult(404,None),
            review_probe=HttpResult(404,None),
        )
        self.assertTrue(result["unauthenticated_health_denied"])

    def test_public_health_is_rejected(self):
        with self.assertRaisesRegex(BoundaryVerificationError,"unauthenticated_health_not_denied"):
            validate_results(
                stage="private_brain_read_candidate",
                unauth_health=HttpResult(200,{"status":"ok"}),
                auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                action_inbox=ok_inbox(),
                proposal_probe=HttpResult(404,None),
                review_probe=HttpResult(404,None),
            )

    def test_action_authority_drift_is_rejected(self):
        with self.assertRaisesRegex(BoundaryVerificationError,"action_inbox_authority_drift"):
            validate_results(
                stage="private_brain_read_candidate",
                unauth_health=HttpResult(401,None),
                auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                action_inbox=HttpResult(200,{"authority":{
                    "public_write_authorized":False,
                    "outbound_authorized":True,
                    "spend_authorized":False,
                    "experiment_execution_authorized":False,
                }}),
                proposal_probe=HttpResult(404,None),
                review_probe=HttpResult(404,None),
            )

    def test_enabled_write_surface_is_rejected_in_private_read_stage(self):
        with self.assertRaisesRegex(BoundaryVerificationError,"proposal_surface_must_be_hidden"):
            validate_results(
                stage="private_brain_read_candidate",
                unauth_health=HttpResult(401,None),
                auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                action_inbox=ok_inbox(),
                proposal_probe=HttpResult(401,{"error":"unauthorized"}),
                review_probe=HttpResult(404,None),
            )

    def test_later_stage_does_not_probe_write_endpoints(self):
        result=validate_results(
            stage="proposal_materialization_candidate",
            unauth_health=HttpResult(401,None),
            auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
            action_inbox=ok_inbox(),
            proposal_probe=None,
            review_probe=None,
        )
        self.assertEqual(result["write_surfaces"],"not_probed_for_write_safety")


if __name__=="__main__":
    unittest.main(verbosity=2)
