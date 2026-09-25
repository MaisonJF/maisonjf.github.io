#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import unittest
from copy import deepcopy

from journey_engine import (
    A3ValidationError,
    DuplicateConflict,
    EconomicsError,
    assess_economic_value,
    CONVERSION_EVENT_TYPES,
    attribution_summary,
    build_journeys,
    new_journey_id,
    validate_solution,
    _new_id,
)
from repository import SQLiteA3Repository


def event(event_type, occurred_at, *, journey_id=None, solution_id=None, value_minor=None,
          currency=None, event_id=None, source="site", idem=None, metadata_json="{}"):
    return {
        "event_id": event_id or _new_id("evt_"),
        "idempotency_key": idem or f"idem:{_new_id('evt_')}",
        "event_type": event_type,
        "source": source,
        "schema_version": 2,
        "occurred_at": occurred_at,
        "journey_id": journey_id,
        "asset_id": None,
        "need_id": None,
        "solution_id": solution_id,
        "value_minor": value_minor,
        "currency": currency,
        "privacy_class": "pseudonymous",
        "payload_hash": "a" * 64,
        "metadata_json": metadata_json,
        "rule_version_id": None,
        "model_version_id": None,
    }


def solution(stype="oracle", delivery="automatic", capacity="scalable", key="oracle"):
    return {
        "solution_id": _new_id("sol_"),
        "solution_key": key,
        "solution_type": stype,
        "delivery_mode": delivery,
        "capacity_class": capacity,
        "status": "active",
    }


def profile(sol_id, *, currency="EUR", ref=200, variable=0, minutes=0,
            human_cost=0, continuation=None, repeat="medium", scale=100,
            confidence="high"):
    return {
        "economics_version_id": _new_id("eco_"),
        "solution_id": sol_id,
        "version_label": "v1",
        "currency": currency,
        "reference_price_minor": ref,
        "variable_cost_minor": variable,
        "human_effort_minutes": minutes,
        "human_effort_cost_minor": human_cost,
        "continuation_expected_value_minor": continuation,
        "repeatability_class": repeat,
        "scalability_score": scale,
        "capacity_units_per_period": None,
        "confidence_class": confidence,
        "confidence_basis": "test fixture",
        "valid_from": "2026-01-01T00:00:00.000Z",
        "valid_to": None,
    }


class JourneyTests(unittest.TestCase):
    def test_complete_multitouch_attribution(self):
        j = new_journey_id(); s = solution()
        events = [
            event("page.view", "2026-09-17T08:00:00Z", journey_id=j),
            event("cta.click", "2026-09-17T08:01:00Z", journey_id=j),
            event("page.view", "2026-09-17T08:02:00Z", journey_id=j),
            event("oracle.purchase", "2026-09-17T08:03:00Z", journey_id=j,
                  solution_id=s["solution_id"], value_minor=200, currency="EUR", source="oracle"),
        ]
        result = build_journeys(events)
        self.assertEqual(len(result.journeys), 1)
        self.assertEqual(result.journeys[0].completeness, "complete")
        self.assertEqual(result.journeys[0].touch_count, 3)
        self.assertEqual(result.journeys[0].conversion_count, 1)
        summary = attribution_summary(result.conversions[0])
        self.assertEqual(summary["first_touch"], events[0]["event_id"])
        self.assertEqual(summary["last_touch"], events[2]["event_id"])
        self.assertEqual(summary["assisted_touches"], [events[1]["event_id"]])

    def test_single_touch_is_first_and_last(self):
        j = new_journey_id(); s = solution()
        touch = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        purchase = event("oracle.purchase", "2026-09-17T08:01:00Z", journey_id=j,
                         solution_id=s["solution_id"], value_minor=200, currency="EUR", source="oracle")
        summary = attribution_summary(build_journeys([touch, purchase]).conversions[0])
        self.assertEqual(summary["first_touch"], touch["event_id"])
        self.assertEqual(summary["last_touch"], touch["event_id"])

    def test_out_of_order_sorted_deterministically(self):
        j = new_journey_id()
        a = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        b = event("cta.click", "2026-09-17T08:02:00Z", journey_id=j)
        c = event("page.view", "2026-09-17T08:01:00Z", journey_id=j)
        snap = build_journeys([b, a, c]).journeys[0]
        self.assertTrue(snap.out_of_order_detected)
        self.assertEqual(snap.event_ids, (a["event_id"], c["event_id"], b["event_id"]))

    def test_duplicate_same_event_collapses(self):
        j = new_journey_id(); a = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        result = build_journeys([a, deepcopy(a)])
        self.assertEqual(result.unique_event_count, 1)
        self.assertEqual(result.duplicate_count, 1)

    def test_duplicate_conflict_rejected(self):
        j = new_journey_id(); a = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        b = deepcopy(a); b["event_type"] = "cta.click"
        with self.assertRaises(DuplicateConflict): build_journeys([a, b])

    def test_incomplete_without_conversion_is_partial(self):
        j = new_journey_id()
        result = build_journeys([event("page.view", "2026-09-17T08:00:00Z", journey_id=j)])
        self.assertEqual(result.journeys[0].completeness, "partial")
        self.assertEqual(result.journeys[0].confidence_class, "medium")

    def test_conversion_only_is_low_confidence(self):
        j = new_journey_id(); s = solution()
        result = build_journeys([event("product.purchase", "2026-09-17T08:00:00Z", journey_id=j,
                                              solution_id=s["solution_id"], value_minor=1400,
                                              currency="EUR", source="commerce")])
        self.assertEqual(result.journeys[0].completeness, "conversion_only")
        self.assertEqual(result.journeys[0].confidence_class, "low")
        self.assertEqual(result.conversions[0].touches, ())

    def test_missing_journey_remains_unresolved_not_inferred(self):
        a = event("page.view", "2026-09-17T08:00:00Z")
        result = build_journeys([a])
        self.assertEqual(len(result.journeys), 0)
        self.assertEqual(result.unresolved[0].reason_code, "missing_journey_id")

    def test_unresolved_conversion_keeps_economic_fact_without_attribution(self):
        s = solution()
        a = event("product.purchase", "2026-09-17T08:00:00Z", solution_id=s["solution_id"],
                  value_minor=1200, currency="EUR", source="commerce")
        result = build_journeys([a])
        self.assertIsNone(result.conversions[0].journey_id)
        self.assertEqual(result.conversions[0].touches, ())

    def test_conversion_requires_solution(self):
        j = new_journey_id()
        with self.assertRaises(A3ValidationError):
            build_journeys([event("oracle.purchase", "2026-09-17T08:00:00Z", journey_id=j,
                                  value_minor=200, currency="EUR", source="oracle")])

    def test_schema_version_mismatch_rejected(self):
        j = new_journey_id(); a = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        a["schema_version"] = 3
        with self.assertRaises(A3ValidationError): build_journeys([a])

    def test_direct_commercial_identity_rejected(self):
        j = new_journey_id(); a = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        a["email"] = "person@example.com"
        with self.assertRaises(A3ValidationError): build_journeys([a])

    def test_paid_oracle_metadata_rejected(self):
        j = new_journey_id()
        a = event("oracle.view", "2026-09-17T08:00:00Z", journey_id=j, source="oracle",
                  metadata_json='{"oracle_answer":"paid text"}')
        with self.assertRaises(A3ValidationError): build_journeys([a])


class EconomicsTests(unittest.TestCase):
    def make_conversion(self, sol, revenue):
        j = new_journey_id()
        result = build_journeys([
            event("page.view", "2026-09-17T08:00:00Z", journey_id=j),
            event("product.purchase" if sol["solution_type"] != "oracle" else "oracle.purchase",
                  "2026-09-17T08:01:00Z", journey_id=j, solution_id=sol["solution_id"],
                  value_minor=revenue, currency="EUR",
                  source="commerce" if sol["solution_type"] != "oracle" else "oracle"),
        ])
        return result.conversions[0]

    def test_price_is_not_realised_revenue(self):
        s = solution(); c = self.make_conversion(s, 200); p = profile(s["solution_id"], ref=9999)
        a = assess_economic_value(c, p)
        self.assertEqual(a.revenue_minor, 200); self.assertEqual(a.immediate_contribution_minor, 200)

    def test_oracle_automatic_economics(self):
        s = solution("oracle", "automatic", "scalable", "oracle"); c = self.make_conversion(s, 200)
        a = assess_economic_value(c, profile(s["solution_id"], variable=20, scale=100,
                                             continuation=80, repeat="high"))
        self.assertEqual(a.immediate_contribution_minor, 180)
        self.assertEqual(a.expected_total_value_minor, 260)
        self.assertEqual(a.human_effort_minutes, 0)

    def test_human_service_economics(self):
        s = solution("service", "human", "human_limited", "consultation"); c = self.make_conversion(s, 3500)
        a = assess_economic_value(c, profile(s["solution_id"], ref=3500, variable=100, minutes=60,
                                             human_cost=1200, scale=20, continuation=500, repeat="medium"))
        self.assertEqual(a.immediate_contribution_minor, 2200)
        self.assertEqual(a.expected_total_value_minor, 2700)
        self.assertEqual(a.human_effort_minutes, 60)

    def test_physical_product_economics(self):
        s = solution("physical_product", "mixed", "inventory_limited", "candle"); c = self.make_conversion(s, 1400)
        a = assess_economic_value(c, profile(s["solution_id"], ref=1400, variable=500, minutes=8,
                                             human_cost=120, scale=55, continuation=150, repeat="medium"))
        self.assertEqual(a.immediate_contribution_minor, 780)

    def test_ebook_profile_supported(self):
        s = solution("ebook", "automatic", "scalable", "ebook")
        self.assertEqual(validate_solution(s)["solution_type"], "ebook")

    def test_b2b_profile_supported(self):
        s = solution("b2b", "human", "negotiated", "b2b")
        self.assertEqual(validate_solution(s)["capacity_class"], "negotiated")

    def test_b2b_lifecycle_reuses_canonical_conversion_kinds(self):
        self.assertEqual(CONVERSION_EVENT_TYPES["b2b.lead"], "lead")
        self.assertEqual(CONVERSION_EVENT_TYPES["b2b.proposal"], "lead")
        self.assertEqual(CONVERSION_EVENT_TYPES["b2b.pilot"], "booking")
        self.assertEqual(CONVERSION_EVENT_TYPES["b2b.purchase"], "purchase")
        self.assertEqual(CONVERSION_EVENT_TYPES["b2b.recurrence"], "order")

    def test_future_collection_profile_supported(self):
        s = solution("digital_collection", "automatic", "scalable", "collection")
        self.assertEqual(validate_solution(s)["solution_type"], "digital_collection")

    def test_currency_mismatch_rejected(self):
        s = solution(); c = self.make_conversion(s, 200)
        with self.assertRaises(EconomicsError): assess_economic_value(c, profile(s["solution_id"], currency="USD"))

    def test_missing_observed_revenue_not_replaced_by_price(self):
        s = solution(); j = new_journey_id()
        c = build_journeys([event("oracle.purchase", "2026-09-17T08:01:00Z", journey_id=j,
                                  solution_id=s["solution_id"], source="oracle")]).conversions[0]
        with self.assertRaises(EconomicsError): assess_economic_value(c, profile(s["solution_id"], ref=200))

    def test_economic_hash_deterministic_for_same_inputs(self):
        s = solution(); c = self.make_conversion(s, 200); p = profile(s["solution_id"], variable=10, continuation=25)
        a1 = assess_economic_value(c, p); a2 = assess_economic_value(c, p)
        self.assertEqual(a1.input_hash, a2.input_hash)


class RepositoryTests(unittest.TestCase):
    def make_db(self):
        con = sqlite3.connect(":memory:"); con.execute("PRAGMA foreign_keys=ON")
        con.executescript("""
        CREATE TABLE schema_state (schema_key TEXT PRIMARY KEY, schema_value TEXT NOT NULL, recorded_at TEXT);
        CREATE TABLE events (
            event_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL, event_type TEXT NOT NULL,
            source TEXT NOT NULL, schema_version INTEGER NOT NULL, occurred_at TEXT NOT NULL,
            received_at TEXT, journey_id TEXT, asset_id TEXT, need_id TEXT, solution_id TEXT,
            value_minor INTEGER, currency TEXT, privacy_class TEXT NOT NULL, payload_hash TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}', rule_version_id TEXT, model_version_id TEXT
        );
        """)
        from pathlib import Path
        con.executescript((Path(__file__).resolve().parent / "migrations" / "0002_journeys_economics.sql").read_text())
        return con

    def insert_event(self, con, e):
        con.execute("""INSERT INTO events
            (event_id,idempotency_key,event_type,source,schema_version,occurred_at,journey_id,asset_id,
             need_id,solution_id,value_minor,currency,privacy_class,payload_hash,metadata_json,
             rule_version_id,model_version_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (e["event_id"],e["idempotency_key"],e["event_type"],e["source"],e["schema_version"],
             e["occurred_at"],e.get("journey_id"),e.get("asset_id"),e.get("need_id"),e.get("solution_id"),
             e.get("value_minor"),e.get("currency"),e["privacy_class"],e["payload_hash"],
             e.get("metadata_json","{}"),e.get("rule_version_id"),e.get("model_version_id")))
        con.commit()

    def test_persist_build_and_assessment(self):
        con = self.make_db(); repo = SQLiteA3Repository(con); s = solution()
        repo.register_solution({**s, "created_by":"test"})
        p = profile(s["solution_id"], variable=20, continuation=50)
        repo.register_economics_profile({**p, "created_by":"test", "created_at":"2026-09-17T08:00:00.000Z"})
        j = new_journey_id()
        e1 = event("page.view", "2026-09-17T08:00:00Z", journey_id=j)
        e2 = event("oracle.purchase", "2026-09-17T08:01:00Z", journey_id=j,
                   solution_id=s["solution_id"], value_minor=200, currency="EUR", source="oracle")
        self.insert_event(con,e1); self.insert_event(con,e2)
        result = build_journeys([e1,e2]); repo.persist_build(result)
        stored = repo.economics_profile_for(s["solution_id"], e2["occurred_at"])
        assessment = assess_economic_value(result.conversions[0], stored); repo.persist_assessment(assessment)
        self.assertEqual(con.execute("SELECT count(*) FROM journey_snapshots").fetchone()[0],1)
        self.assertEqual(con.execute("SELECT count(*) FROM conversions").fetchone()[0],1)
        self.assertEqual(con.execute("SELECT immediate_contribution_minor FROM conversion_economic_assessments").fetchone()[0],180)
        self.assertEqual(con.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a3_schema_version'").fetchone()[0],"A3.1")

    def test_derived_tables_are_immutable(self):
        con = self.make_db(); repo=SQLiteA3Repository(con); s=solution()
        repo.register_solution({**s,"created_by":"test"})
        with self.assertRaises(sqlite3.DatabaseError): con.execute("UPDATE solutions SET status='paused' WHERE solution_id=?",(s["solution_id"],))


if __name__ == "__main__": unittest.main(verbosity=2)
