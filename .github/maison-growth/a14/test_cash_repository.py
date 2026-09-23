#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import unittest
from pathlib import Path

from repository import SQLiteA14Repository


class A14CashRepositoryTests(unittest.TestCase):
    def make_db(self):
        con=sqlite3.connect(":memory:")
        con.execute("PRAGMA foreign_keys=ON")
        con.executescript("""
        CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY, schema_value TEXT NOT NULL);
        CREATE TABLE needs(need_id TEXT PRIMARY KEY);
        CREATE TABLE solutions(solution_id TEXT PRIMARY KEY);
        CREATE TABLE experiments(experiment_id TEXT PRIMARY KEY);
        CREATE TABLE experiment_versions(experiment_version_id TEXT PRIMARY KEY, experiment_id TEXT);
        CREATE TABLE events(event_id TEXT PRIMARY KEY);
        CREATE TABLE autonomy_action_log(action_id TEXT PRIMARY KEY);
        CREATE TABLE autonomy_human_queue(queue_id TEXT PRIMARY KEY);
        CREATE TABLE conversions(
          conversion_id TEXT PRIMARY KEY,
          solution_id TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          revenue_minor INTEGER,
          currency TEXT
        );
        CREATE TABLE conversion_economic_assessments(
          economic_assessment_id TEXT PRIMARY KEY,
          conversion_id TEXT NOT NULL,
          variable_cost_minor INTEGER NOT NULL,
          human_effort_cost_minor INTEGER NOT NULL,
          immediate_contribution_minor INTEGER NOT NULL,
          repeatability_class TEXT NOT NULL,
          confidence_class TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE learning_records(learning_record_id TEXT PRIMARY KEY);
        """)
        root=Path(__file__).resolve().parent/"migrations"
        con.executescript((root/"0012_universal_opportunity_earned_distribution.sql").read_text())
        con.executescript((root/"0013_a14_bridges_cash.sql").read_text())
        return con

    def test_a3_observed_money_drives_cash_snapshot(self):
        con=self.make_db(); repo=SQLiteA14Repository(con)
        con.execute("INSERT INTO solutions VALUES (?)",("sol_"+"2"*36,))
        con.execute("INSERT INTO conversions VALUES (?,?,?,?,?)",
                    ("cnv_"+"3"*36,"sol_"+"2"*36,"2026-09-23T10:00:00Z",10000,"EUR"))
        con.execute("INSERT INTO conversion_economic_assessments VALUES (?,?,?,?,?,?,?,?)",
                    ("eva_"+"4"*36,"cnv_"+"3"*36,1000,500,6000,"medium","observed","2026-09-23T10:01:00Z"))
        con.execute("INSERT INTO conversion_economic_assessments VALUES (?,?,?,?,?,?,?,?)",
                    ("eva_"+"5"*36,"cnv_"+"3"*36,1000,500,6500,"medium","observed","2026-09-23T10:02:00Z"))
        snap=repo.cash_snapshot(currency="EUR",since="2026-09-23T00:00:00Z")
        self.assertEqual(snap.realised_revenue_minor,10000)
        self.assertEqual(snap.realised_contribution_minor,6500)
        self.assertEqual(snap.contributing_conversions,1)

    def test_bridge_persistence_keeps_authority_in_existing_modules(self):
        con=self.make_db(); repo=SQLiteA14Repository(con)
        con.execute("INSERT INTO autonomy_action_log VALUES (?)",("act_"+"1"*36,))
        con.execute("INSERT INTO autonomy_human_queue VALUES (?)",("inq_"+"2"*36,))
        con.execute("""INSERT INTO opportunity_hypotheses
          (opportunity_id,need_id,territory_code,opportunity_score,confidence,
           known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
           existing_solution_ids_json,knowledge_context_refs_json,status,
           reason_codes_json,rule_version_id,model_version_id,input_hash,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("opp_"+"3"*36,None,"CASA",80,0.8,"[]","[]","[]","[]","[]",
           "human_review_required","[]","rule",None,"a"*64,"2026-09-23T14:00:00Z"))
        repo.persist_governance_link({
            "governance_link_id":"gvl_"+"4"*36,
            "opportunity_id":"opp_"+"3"*36,
            "distribution_match_id":None,
            "action_id":"act_"+"1"*36,
            "queue_id":"inq_"+"2"*36,
            "evidence_refs":["evd_test"],
            "linked_at":"2026-09-23T14:01:00Z",
        })
        row=con.execute("SELECT action_id,queue_id FROM a14_governance_links").fetchone()
        self.assertEqual(row,("act_"+"1"*36,"inq_"+"2"*36))


if __name__=="__main__":
    unittest.main(verbosity=2)
