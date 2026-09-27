#!/usr/bin/env python3
import sqlite3
import unittest
from commercial_recovery import CommercialRecoveryJournal, RecoveryError

class CommercialRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.journal=CommercialRecoveryJournal(self.db)

    def test_failed_write_survives_and_can_be_retried(self):
        rid=self.journal.capture(
            kind="product_candidate",
            payload={"name":"Produto de teste","concept":"preservado antes da escrita"},
            intended_destination="data/products.js",
            source_ref="test:controlled-failure")
        self.journal.record_failure(rid,"simulated_git_write_failure")
        pending=self.journal.unresolved()
        self.assertEqual(len(pending),1)
        self.assertEqual(pending[0]["recovery_id"],rid)
        self.assertEqual(pending[0]["state"],"pending_write")
        self.assertEqual(pending[0]["attempt_count"],1)
        self.assertEqual(pending[0]["payload"]["name"],"Produto de teste")

        self.journal.mark_integrated(rid,"data/products.js#test",readback_verified=True)
        self.assertEqual(self.journal.unresolved(),[])

    def test_readback_is_mandatory(self):
        rid=self.journal.capture(kind="service_candidate",payload={"name":"Serviço de teste"},intended_destination="data/services.js")
        with self.assertRaisesRegex(RecoveryError,"readback_required"):
            self.journal.mark_integrated(rid,"data/services.js#test",readback_verified=False)
        self.assertEqual(len(self.journal.unresolved()),1)

    def test_sensitive_payload_is_rejected(self):
        with self.assertRaisesRegex(RecoveryError,"forbidden_payload_key"):
            self.journal.capture(kind="candidate",payload={"credentials":"never"},intended_destination="internal")

if __name__=="__main__":
    unittest.main()
