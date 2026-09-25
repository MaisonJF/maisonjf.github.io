#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from collector import (
    EventCollector,
    IdempotencyConflict,
    MemoryEventStore,
    PrivacyViolation,
    SQLiteA1EventStore,
    TransientStorageError,
    UnknownSource,
    UnsupportedContractVersion,
    ValidationError,
    failure_plan,
    normalize_ingestion,
    to_a1_event,
)

A1_SCHEMA = HERE.parent / "a1" / "schema.sql"


def valid_site(**overrides):
    event = {
        "contract_version": 1,
        "source": "site",
        "event_type": "page.view",
        "occurred_at": "2026-09-17T09:00:00+01:00",
        "idempotency_key": "site:page:0001",
        "privacy_class": "anonymous",
        "metadata": {
            "path": "/relacoes/ele-afastou-se?utm_source=test#x",
            "referrer_host": "Google.COM.",
            "surface": "ocean",
        },
    }
    event.update(overrides)
    return event


class CollectorUnitTests(unittest.TestCase):
    def test_valid_event_is_normalized_to_a1(self):
        normalized = normalize_ingestion(valid_site(source=" SITE ", event_type=" Page.View "))
        self.assertEqual(normalized["source"], "site")
        self.assertEqual(normalized["event_type"], "page.view")
        self.assertEqual(normalized["occurred_at"], "2026-09-17T08:00:00.000Z")
        self.assertEqual(normalized["metadata"]["path"], "/relacoes/ele-afastou-se")
        self.assertEqual(normalized["metadata"]["referrer_host"], "google.com")
        event = to_a1_event(normalized)
        self.assertEqual(event["schema_version"], 2)
        self.assertTrue(event["event_id"].startswith("evt_"))
        self.assertEqual(len(event["event_id"]), 40)
        self.assertEqual(len(event["payload_hash"]), 64)
        self.assertEqual(json.loads(event["metadata_json"])["path"], "/relacoes/ele-afastou-se")

    def test_duplicate_same_payload_is_idempotent(self):
        collector = EventCollector(MemoryEventStore())
        first = collector.ingest(valid_site())
        second = collector.ingest(valid_site())
        self.assertFalse(first.duplicate)
        self.assertTrue(second.duplicate)
        self.assertEqual(first.event_id, second.event_id)
        self.assertEqual(first.payload_hash, second.payload_hash)

    def test_same_key_different_payload_is_conflict(self):
        collector = EventCollector(MemoryEventStore())
        collector.ingest(valid_site())
        changed = valid_site(metadata={"path": "/different", "surface": "ocean"})
        with self.assertRaises(IdempotencyConflict):
            collector.ingest(changed)

    def test_site_cta_contract_is_exact_and_structural(self):
        event = valid_site(
            event_type="cta.click",
            idempotency_key="site:cta:0001",
            metadata={
                "path": "/servicos/",
                "cta_id": "tarot_primary",
                "surface": "service-card",
            },
        )
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["event_type"], "cta.click")
        self.assertEqual(normalized["metadata"]["cta_id"], "tarot_primary")

    def test_site_navigation_contract_accepts_target_path(self):
        event = valid_site(
            event_type="navigation.click",
            idempotency_key="site:navigation:0001",
            metadata={
                "path": "/",
                "navigation_id": "primary_services",
                "target_path": "/servicos/?from=header",
                "surface": "header",
            },
        )
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["metadata"]["target_path"], "/servicos/")

    def test_site_prefix_does_not_allow_undeclared_event(self):
        with self.assertRaises(ValidationError):
            normalize_ingestion(valid_site(
                event_type="page.secret",
                idempotency_key="site:page:secret:0001",
            ))

    def test_site_event_rejects_metadata_from_another_site_event(self):
        with self.assertRaises(ValidationError):
            normalize_ingestion(valid_site(
                event_type="page.view",
                idempotency_key="site:page:wrong-meta:0001",
                metadata={
                    "path": "/",
                    "offer_id": "tarot",
                },
            ))

    def test_offer_interaction_is_privacy_safe_and_normalized(self):
        event = valid_site(
            event_type="offer.click",
            idempotency_key="site:offer:click:0001",
            metadata={
                "path": "/teste/",
                "surface": "recommendation",
                "offer_id": "tarot",
                "recommendation_source": "teste",
                "recommendation_result": "clareza",
                "recommendation_route": "talk",
                "recommendation_brain": "offer-brain-v1",
            },
        )
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["event_type"], "offer.click")
        self.assertEqual(normalized["metadata"]["offer_id"], "tarot")
        self.assertNotIn("answer", normalized["metadata"])

    def test_b2b_lead_accepts_only_contract_non_pii(self):
        event = {
            "contract_version": 1,
            "source": "commerce",
            "event_type": "b2b.lead",
            "occurred_at": "2026-09-25T12:00:00Z",
            "idempotency_key": "b2b:lead:fixture-1",
            "privacy_class": "pseudonymous",
            "metadata": {
                "interest": "b2b",
                "origin": "professional_test",
                "business": "spa",
                "goal": "diferenciar",
                "gap": "continuity",
                "client": "consumer",
                "model": "service",
                "scale": "small",
                "start": "pilot",
                "result_type": "signature"
            }
        }
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["event_type"], "b2b.lead")
        self.assertEqual(normalized["metadata"]["business"], "spa")

    def test_b2b_lead_rejects_identity_and_free_text(self):
        base = {
            "contract_version": 1,
            "source": "commerce",
            "event_type": "b2b.lead",
            "occurred_at": "2026-09-25T12:00:00Z",
            "idempotency_key": "b2b:lead:fixture-2",
            "privacy_class": "pseudonymous",
        }
        for forbidden in ("name","email","phone","free_text_message","health_data","client_identity"):
            event = dict(base)
            event["metadata"] = {"business": "spa", forbidden: "forbidden-value"}
            with self.assertRaises(ValidationError):
                normalize_ingestion(event)

    def test_content_performance_contract_is_accepted(self):
        event = {
            "contract_version": 1,
            "source": "maison-content-distribution",
            "event_type": "content.performance_observed",
            "occurred_at": "2026-09-25T12:00:00Z",
            "idempotency_key": "content:performance:fixture-1",
            "privacy_class": "aggregated",
            "metadata": {
                "content_id": "cnt-fixture-1",
                "channel": "instagram_reels",
                "platform": "instagram",
                "surface": "reels",
                "format": "short_video",
                "impressions": 100,
                "views": 60,
                "link_clicks": 7,
                "conversions": 1,
                "click_rate_bps": 700,
                "conversion_rate_bps": 1429
            }
        }
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["source"], "maison-content-distribution")
        self.assertEqual(normalized["event_type"], "content.performance_observed")
        self.assertEqual(normalized["metadata"]["conversions"], 1)

    def test_sos_product_contract_is_aggregate_only(self):
        event = {
            "contract_version": 1,
            "source": "sos_product",
            "event_type": "sos.checkin_summary",
            "occurred_at": "2026-09-25T12:00:00Z",
            "idempotency_key": "sos:summary:fixture-1",
            "privacy_class": "aggregated",
            "metadata": {
                "product_id": "sos-maison",
                "signal_kind": "checkin_completed",
                "cadence_bucket": "daily",
                "delivery_outcome": "completed",
                "product_version": "v1",
                "count": 3
            }
        }
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["source"], "sos_product")
        self.assertEqual(normalized["metadata"]["count"], 3)

    def test_unknown_source_rejected(self):
        with self.assertRaises(UnknownSource):
            normalize_ingestion(valid_site(source="mystery"))

    def test_unsupported_contract_version_rejected(self):
        with self.assertRaises(UnsupportedContractVersion):
            normalize_ingestion(valid_site(contract_version=99))

    def test_unknown_top_level_field_rejected(self):
        event = valid_site()
        event["email"] = "nobody@example.com"
        with self.assertRaises(ValidationError):
            normalize_ingestion(event)

    def test_unknown_metadata_rejected(self):
        event = valid_site()
        event["metadata"]["unexpected"] = "x"
        with self.assertRaises(ValidationError):
            normalize_ingestion(event)

    def test_direct_email_value_rejected_even_in_allowed_token(self):
        event = valid_site(metadata={"path": "/", "cta_id": "person@example.com"})
        with self.assertRaises(PrivacyViolation):
            normalize_ingestion(event)

    def test_direct_pii_key_rejected(self):
        event = valid_site(metadata={"path": "/", "email": "masked"})
        with self.assertRaises(PrivacyViolation):
            normalize_ingestion(event)

    def test_oracle_paid_text_rejected(self):
        event = {
            "contract_version": 1,
            "source": "oracle",
            "event_type": "oracle.purchase",
            "occurred_at": "2026-09-17T09:00:00Z",
            "idempotency_key": "oracle:purchase:1",
            "privacy_class": "pseudonymous",
            "metadata": {
                "territory_id": "relacoes",
                "class_id": "silencio",
                "oracle_response": "texto pago que nunca deve entrar"
            },
        }
        with self.assertRaises(PrivacyViolation):
            normalize_ingestion(event)

    def test_oracle_analytics_only_is_accepted(self):
        event = {
            "contract_version": 1,
            "source": "oracle",
            "event_type": "oracle.purchase",
            "occurred_at": "2026-09-17T09:00:00Z",
            "idempotency_key": "oracle:purchase:2",
            "privacy_class": "pseudonymous",
            "metadata": {
                "territory_id": "relacoes",
                "class_id": "silencio",
                "repeat_usage": True,
                "conversion_stage": "purchase",
                "reading_id_hash": "a" * 64,
            },
            "value_minor": 200,
            "currency": "eur",
        }
        normalized = normalize_ingestion(event)
        self.assertEqual(normalized["currency"], "EUR")
        self.assertEqual(normalized["metadata"]["class_id"], "silencio")

    def test_commerce_direct_identity_is_not_allowlisted(self):
        event = {
            "contract_version": 1,
            "source": "commerce",
            "event_type": "commerce.purchase",
            "occurred_at": "2026-09-17T09:00:00Z",
            "idempotency_key": "commerce:purchase:1",
            "privacy_class": "pseudonymous",
            "metadata": {
                "product_id": "ebook-1",
                "stripe_customer_id": "cus_123"
            },
        }
        with self.assertRaises(PrivacyViolation):
            normalize_ingestion(event)

    def test_gsc_raw_query_is_not_allowed(self):
        event = {
            "contract_version": 1,
            "source": "gsc",
            "event_type": "discovery.search",
            "occurred_at": "2026-09-17T09:00:00Z",
            "idempotency_key": "gsc:query:0001",
            "privacy_class": "aggregated",
            "metadata": {"query_text": "porque ele se afasta"},
        }
        with self.assertRaises(PrivacyViolation):
            normalize_ingestion(event)

    def test_value_requires_currency(self):
        with self.assertRaises(ValidationError):
            normalize_ingestion(valid_site(value_minor=200))

    def test_retry_policy_permanent_rejection_never_stores_raw(self):
        raw = valid_site(metadata={"path": "/", "email": "x@example.com"})
        error = PrivacyViolation("forbidden")
        plan = failure_plan(raw, error, attempt=0)
        self.assertEqual(plan.action, "reject")
        self.assertEqual(plan.dead_letter_mode, "sanitized_fingerprint_only")
        self.assertFalse(plan.sanitized_failure["raw_payload_persisted"])
        self.assertNotIn("raw", plan.sanitized_failure)

    def test_retry_policy_transient_backoff_then_dead_letter(self):
        error = TransientStorageError("temporary")
        plan0 = failure_plan(valid_site(), error, attempt=0)
        self.assertEqual((plan0.action, plan0.next_delay_seconds), ("retry", 5))
        plan4 = failure_plan(valid_site(), error, attempt=4)
        self.assertEqual((plan4.action, plan4.next_delay_seconds), ("retry", 3600))
        exhausted = failure_plan(valid_site(), error, attempt=5)
        self.assertEqual(exhausted.action, "dead_letter")
        self.assertEqual(exhausted.dead_letter_mode, "dead_letter_validated_event")


class A1CompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.con = sqlite3.connect(":memory:")
        self.con.execute("PRAGMA foreign_keys=ON")
        self.con.executescript(A1_SCHEMA.read_text(encoding="utf-8"))
        self.store = SQLiteA1EventStore(self.con)
        self.collector = EventCollector(self.store)

    def tearDown(self):
        self.con.close()

    def test_valid_event_persists_in_a1_schema(self):
        result = self.collector.ingest(valid_site())
        row = self.con.execute(
            "SELECT event_id,schema_version,source,event_type,payload_hash,metadata_json "
            "FROM events WHERE event_id=?",
            (result.event_id,),
        ).fetchone()
        self.assertEqual(row[0], result.event_id)
        self.assertEqual(row[1], 2)
        self.assertEqual(row[2:4], ("site", "page.view"))
        self.assertEqual(row[4], result.payload_hash)
        self.assertEqual(json.loads(row[5])["surface"], "ocean")
        reg = self.con.execute(
            "SELECT object_id,payload_hash FROM idempotency_registry "
            "WHERE scope='events:site' AND idempotency_key='site:page:0001'"
        ).fetchone()
        self.assertEqual(reg, (result.event_id, result.payload_hash))

    def test_sqlite_duplicate_returns_original_event(self):
        first = self.collector.ingest(valid_site())
        second = self.collector.ingest(valid_site())
        self.assertTrue(second.duplicate)
        self.assertEqual(first.event_id, second.event_id)
        self.assertEqual(self.con.execute("SELECT count(*) FROM events").fetchone()[0], 1)
        self.assertEqual(self.con.execute("SELECT count(*) FROM idempotency_registry").fetchone()[0], 1)

    def test_sqlite_idempotency_conflict_rejected(self):
        self.collector.ingest(valid_site())
        changed = valid_site(metadata={"path": "/outra", "surface": "ocean"})
        with self.assertRaises(IdempotencyConflict):
            self.collector.ingest(changed)
        self.assertEqual(self.con.execute("SELECT count(*) FROM events").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
