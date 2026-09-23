#!/usr/bin/env python3
from __future__ import annotations

import sqlite3
import unittest
from pathlib import Path


class A14BridgeSchemaTests(unittest.TestCase):
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
          confidence_class TEXT NOT NULL
        );
        CREATE TABLE learning_records(learning_record_id TEXT PRIMARY KEY);
        """)
        root=Path(__file__).resolve().parent/"migrations"
        con.executescript((root/"0012_universal_opportunity_earned_distribution.sql").read_text())
        con.executescript((root/"0013_a14_bridges_recovery.sql").read_text())
        return con

    def seed_a14(self,con):
        con.execute("""INSERT INTO opportunity_hypotheses
          (opportunity_id,need_id,territory_code,opportunity_score,confidence,
           known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
           existing_solution_ids_json,knowledge_context_refs_json,status,
           reason_codes_json,rule_version_id,model_version_id,input_hash,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("opp_"+"1"*36,None,"CASA",80,0.8,"[]","[]","[]","[]","[]",
           "human_review_required","[]","rule",None,"a"*64,"2026-09-23T14:00:00Z"))
        con.execute("""INSERT INTO opportunity_offer_hypotheses
          (offer_hypothesis_id,opportunity_id,offer_type,a3_solution_type,
           existing_solution_id,fit_score,fit_confidence,economics_json,
           validation_mode,evidence_refs_json,reason_codes_json,
           human_review_required,launch_authorized,price_authorized,
           public_side_effects,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("ofh_"+"2"*36,"opp_"+"1"*36,"service","service",None,85,0.7,
           "{}","direct_service_test","[]","[]",1,0,0,0,"2026-09-23T14:01:00Z"))
        con.execute("""INSERT INTO earned_distribution_match_assessments
          (distribution_match_id,offer_hypothesis_id,amplifier_ref,moment_key,
           story_angle_key,channel_class,fit_score,fit_confidence,
           known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
           economics_json,recommended_strategy,recommendation_state,
           outbound_authorized,spend_authorized,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          ("dma_"+"3"*36,"ofh_"+"2"*36,"a13:entity:test","autumn","story","creator",
           88,0.8,"[]","[]","[]","{}","zero_cash_story","recommend",0,0,
           "2026-09-23T14:02:00Z"))

    def test_a3_outcome_is_visible_without_copying_economics(self):
        con=self.make_db(); self.seed_a14(con)
        con.execute("INSERT INTO solutions(solution_id) VALUES (?)",("sol_"+"4"*36,))
        con.execute("INSERT INTO conversions VALUES (?,?,?,?,?)",
                    ("cnv_"+"5"*36,"sol_"+"4"*36,"2026-09-23T15:00:00Z",3500,"EUR"))
        con.execute("INSERT INTO conversion_economic_assessments VALUES (?,?,?,?,?,?,?)",
                    ("eva_"+"6"*36,"cnv_"+"5"*36,200,300,3000,"medium","observed"))
        con.execute("""INSERT INTO a14_outcome_links
          (outcome_link_id,opportunity_id,offer_hypothesis_id,distribution_match_id,
           conversion_id,economic_assessment_id,attribution_role,evidence_refs_json,linked_at)
          VALUES (?,?,?,?,?,?,?,?,?)""",
          ("aol_"+"7"*36,"opp_"+"1"*36,"ofh_"+"2"*36,"dma_"+"3"*36,
           "cnv_"+"5"*36,"eva_"+"6"*36,"direct","[]","2026-09-23T15:01:00Z"))
        row=con.execute("SELECT revenue_minor,immediate_contribution_minor FROM a14_realised_economics").fetchone()
        self.assertEqual(row,(3500,3000))

    def test_recovery_target_has_no_repository_default_and_is_immutable(self):
        con=self.make_db()
        self.assertEqual(con.execute("SELECT count(*) FROM recovery_target_versions").fetchone()[0],0)
        con.execute("""INSERT INTO recovery_target_versions
          (recovery_target_version_id,target_key,target_amount_minor,currency,basis,
           valid_from,valid_to,created_at,created_by,notes_json)
          VALUES (?,?,?,?,?,?,?,?,?,?)""",
          ("rtv_"+"8"*36,"capital_recovery",100000,"EUR","a3_immediate_contribution",
           "2026-09-23T00:00:00Z",None,"2026-09-23T00:00:00Z","private_runtime","{}"))
        with self.assertRaises(sqlite3.DatabaseError):
            con.execute("UPDATE recovery_target_versions SET target_amount_minor=1")


if __name__=="__main__":
    unittest.main(verbosity=2)
