#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import unittest
from pathlib import Path

from repository import SQLiteA14Repository


class A14RepositoryTests(unittest.TestCase):
    def make_db(self):
        con = sqlite3.connect(":memory:")
        con.execute("PRAGMA foreign_keys=ON")
        con.executescript("""
        CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY, schema_value TEXT NOT NULL);
        CREATE TABLE needs(need_id TEXT PRIMARY KEY);
        CREATE TABLE solutions(solution_id TEXT PRIMARY KEY);
        CREATE TABLE experiments(experiment_id TEXT PRIMARY KEY);
        CREATE TABLE events(event_id TEXT PRIMARY KEY);
        """)
        migration = Path(__file__).resolve().parent / "migrations" / "0012_universal_opportunity_earned_distribution.sql"
        con.executescript(migration.read_text(encoding="utf-8"))
        return con

    def test_opportunity_roundtrip_and_append_only(self):
        con = self.make_db()
        repo = SQLiteA14Repository(con)
        record = {
            "opportunity_id": "opp_" + "1"*36,
            "need_id": None,
            "territory_code": "CASA",
            "opportunity_score": 82.0,
            "confidence": 0.61,
            "known_dimensions": ["demand"],
            "unknown_dimensions": ["growth"],
            "evidence_refs": ["evd_x"],
            "existing_solution_ids": [],
            "knowledge_context_refs": ["ocean:casa","osiris:entity:abc"],
            "status": "human_review_required",
            "reason_codes": ["test"],
            "rule_version_id": "a14_policy_test",
            "model_version_id": None,
            "input_hash": "a"*64,
            "created_at": "2026-09-23T14:00:00.000Z",
        }
        repo.persist_opportunity(record)
        con.commit()
        stored = repo.fetch_opportunity(record["opportunity_id"])
        self.assertEqual(stored["territory_code"], "CASA")
        self.assertEqual(stored["knowledge_context_refs"], ["ocean:casa","osiris:entity:abc"])
        with self.assertRaises(sqlite3.DatabaseError):
            con.execute("UPDATE opportunity_hypotheses SET status='archived' WHERE opportunity_id=?", (record["opportunity_id"],))

    def test_distribution_match_cannot_authorize_outbound_or_spend(self):
        con = self.make_db()
        repo = SQLiteA14Repository(con)
        con.execute("""INSERT INTO opportunity_hypotheses
            (opportunity_id,need_id,territory_code,opportunity_score,confidence,
             known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
             existing_solution_ids_json,knowledge_context_refs_json,status,
             reason_codes_json,rule_version_id,model_version_id,input_hash,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            ("opp_"+"1"*36,None,"CASA",80,0.8,"[]","[]","[]","[]","[]",
             "human_review_required","[]","r",None,"b"*64,"2026-09-23T14:00:00.000Z"))
        con.execute("""INSERT INTO opportunity_offer_hypotheses
            (offer_hypothesis_id,opportunity_id,offer_type,a3_solution_type,existing_solution_id,
             fit_score,fit_confidence,economics_json,validation_mode,evidence_refs_json,
             reason_codes_json,human_review_required,launch_authorized,price_authorized,
             public_side_effects,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            ("ofh_"+"2"*36,"opp_"+"1"*36,"physical_product","physical_product",None,
             90,0.8,"{}","small_batch","[]","[]",1,0,0,0,"2026-09-23T14:00:00.000Z"))
        repo.persist_distribution_match({
            "distribution_match_id":"dma_"+"3"*36,
            "offer_hypothesis_id":"ofh_"+"2"*36,
            "amplifier_ref":"a13:entity:test",
            "moment_key":"outono",
            "story_angle_key":"aconchego",
            "channel_class":"creator",
            "fit_score":90,
            "fit_confidence":0.8,
            "known_dimensions":["topic_fit"],
            "unknown_dimensions":[],
            "evidence_refs":["evd_x"],
            "economics":{},
            "recommended_strategy":"zero_cash_story",
            "recommendation_state":"recommend",
            "created_at":"2026-09-23T14:00:00.000Z",
        })
        row=con.execute("""SELECT outbound_authorized,spend_authorized
                           FROM earned_distribution_match_assessments""").fetchone()
        self.assertEqual(row,(0,0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
