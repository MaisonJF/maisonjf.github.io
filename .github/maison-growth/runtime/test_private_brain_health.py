#!/usr/bin/env python3
from __future__ import annotations

import unittest

from verify_private_brain_health import validate_health
from verify_private_brain_boundary import BoundaryVerificationError, HttpResult, validate_results


class PrivateBrainHealthTests(unittest.TestCase):
    def test_accepts_only_read_only_health(self):
        result = validate_health({"status": "ok", "mode": "read_only"})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["mode"], "read_only")
        self.assertFalse(result["writes_performed"])
        self.assertFalse(result["execution_authority"])

    def test_rejects_non_ok_status(self):
        with self.assertRaisesRegex(ValueError, "health_not_ok"):
            validate_health({"status": "degraded", "mode": "read_only"})

    def test_rejects_non_read_only_mode(self):
        with self.assertRaisesRegex(ValueError, "health_not_read_only"):
            validate_health({"status": "ok", "mode": "write"})

    def test_boundary_requires_denied_unauthenticated_health_and_false_authority(self):
        result=validate_results(
            stage="private_brain_read_candidate",
            edge_unauth_health=HttpResult(302,None),
            app_unauth_health=HttpResult(401,{"error":"unauthorized"}),
            auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
            action_inbox=HttpResult(200,{"authority":{
                "public_write_authorized":False,
                "outbound_authorized":False,
                "spend_authorized":False,
                "experiment_execution_authorized":False,
            }}),
            proposal_probe=HttpResult(404,{"error":"not_found"}),
            review_probe=HttpResult(404,{"error":"not_found"}),
        )
        self.assertEqual(result["write_surfaces"],"hidden_404")
        self.assertTrue(result["cloudflare_access_edge_denied"])
        self.assertTrue(result["worker_bearer_denied"])
        self.assertFalse(result["writes_performed"])

    def test_full_private_runtime_accepts_enabled_write_surfaces_without_writing(self):
        result=validate_results(
            stage="human_review_decision_candidate",
            edge_unauth_health=HttpResult(403,None),
            app_unauth_health=HttpResult(401,{"error":"unauthorized"}),
            auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
            action_inbox=HttpResult(200,{"authority":{
                "public_write_authorized":False,
                "outbound_authorized":False,
                "spend_authorized":False,
                "experiment_execution_authorized":False,
            }}),
            proposal_probe=HttpResult(405,{"error":"method_not_allowed"}),
            review_probe=HttpResult(405,{"error":"method_not_allowed"}),
        )
        self.assertEqual(result["write_surfaces"],"proposal_and_review_enabled_no_write_probe")
        self.assertFalse(result["writes_performed"])

    def test_boundary_rejects_missing_worker_bearer_boundary(self):
        safe_inbox=HttpResult(200,{"authority":{
            "public_write_authorized":False,
            "outbound_authorized":False,
            "spend_authorized":False,
            "experiment_execution_authorized":False,
        }})
        with self.assertRaisesRegex(BoundaryVerificationError,"worker_bearer_not_enforced"):
            validate_results(
                stage="private_brain_read_candidate",
                edge_unauth_health=HttpResult(403,None),
                app_unauth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                action_inbox=safe_inbox,
                proposal_probe=HttpResult(404,None),
                review_probe=HttpResult(404,None),
            )

    def test_boundary_rejects_public_health_or_authority_drift(self):
        safe_inbox=HttpResult(200,{"authority":{
            "public_write_authorized":False,
            "outbound_authorized":False,
            "spend_authorized":False,
            "experiment_execution_authorized":False,
        }})
        with self.assertRaisesRegex(BoundaryVerificationError,"cloudflare_access_edge_not_enforced"):
            validate_results(
                stage="private_brain_read_candidate",
                edge_unauth_health=HttpResult(200,{"status":"ok"}),
                app_unauth_health=HttpResult(401,None),
                auth_health=HttpResult(200,{"status":"ok","mode":"read_only"}),
                action_inbox=safe_inbox,
                proposal_probe=HttpResult(404,None),
                review_probe=HttpResult(404,None),
            )
        with self.assertRaisesRegex(BoundaryVerificationError,"action_inbox_authority_drift"):
            validate_results(
                stage="private_brain_read_candidate",
                edge_unauth_health=HttpResult(403,None),
                app_unauth_health=HttpResult(401,None),
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
