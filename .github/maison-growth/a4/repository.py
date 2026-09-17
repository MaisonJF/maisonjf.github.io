#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3
from typing import Any, Mapping, Optional
from map_core import new_id, CoverageResult, RadarEvidence, coverage_input_hash

class SQLiteA4Repository:
    """D1/SQLite-compatible repository port. No network or public-site dependency."""

    def __init__(self, connection: sqlite3.Connection):
        self.db=connection
        self.db.execute("PRAGMA foreign_keys=ON")

    def insert_need(self, need_id, need_key, label, territory_key, created_at, created_by, state="observe"):
        self.db.execute("""INSERT INTO needs
          (need_id,need_key,canonical_label,territory_key,internal_state,created_at,created_by)
          VALUES (?,?,?,?,?,?,?)""",(need_id,need_key,label,territory_key,state,created_at,created_by))

    def insert_intent(self, intent_id, need_id, intent_key, label, fingerprint, created_at, created_by, state="observe"):
        self.db.execute("""INSERT INTO intents
          (intent_id,need_id,intent_key,canonical_label,semantic_fingerprint,internal_state,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?)""",(intent_id,need_id,intent_key,label,fingerprint,state,created_at,created_by))

    def intent_by_fingerprint(self, fingerprint):
        return self.db.execute("SELECT intent_id FROM intents WHERE semantic_fingerprint=?",(fingerprint,)).fetchone()

    def insert_asset(self, asset_id, asset_key, asset_type, public_path, status, created_at, created_by):
        self.db.execute("""INSERT INTO assets(asset_id,asset_key,asset_type,public_path,status,created_at,created_by)
          VALUES (?,?,?,?,?,?,?)""",(asset_id,asset_key,asset_type,public_path,status,created_at,created_by))

    def add_evidence(self, evidence_id: str, evidence: RadarEvidence, *, created_at: str):
        self.db.execute("""INSERT INTO map_evidence
          (evidence_id,source,source_event_id,journey_id,evidence_kind,observed_at,strength,
           confidence_class,payload_hash,facts_json,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)""",(
            evidence_id,evidence.source,evidence.source_event_id,evidence.journey_id,evidence.evidence_kind,
            evidence.occurred_at,evidence.strength,evidence.confidence_class,evidence.payload_hash,
            json.dumps(evidence.facts,sort_keys=True,separators=(",",":")),created_at))

    def add_need_asset_relation(self, relation_id, need_id, asset_id, role, strength, created_at, created_by, status="active"):
        self.db.execute("""INSERT INTO need_asset_relations
          (relation_id,need_id,asset_id,relation_role,strength,status,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?)""",(relation_id,need_id,asset_id,role,strength,status,created_at,created_by))

    def add_need_solution_relation(self, relation_id, need_id, solution_id, role, strength, created_at, created_by, status="active"):
        self.db.execute("""INSERT INTO need_solution_relations
          (relation_id,need_id,solution_id,relation_role,strength,status,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?)""",(relation_id,need_id,solution_id,role,strength,status,created_at,created_by))

    def attach_relation_evidence(self, relation_type, relation_id, evidence_id):
        self.db.execute("INSERT INTO relation_evidence(relation_type,relation_id,evidence_id) VALUES (?,?,?)",
                        (relation_type,relation_id,evidence_id))

    def need_relations(self, need_id):
        assets=[dict(zip(("relation_id","asset_id","relation_role","strength","status"),r)) for r in
                self.db.execute("""SELECT relation_id,asset_id,relation_role,strength,status
                    FROM need_asset_relations WHERE need_id=? ORDER BY relation_id""",(need_id,)).fetchall()]
        solutions=[dict(zip(("relation_id","solution_id","relation_role","strength","status"),r)) for r in
                   self.db.execute("""SELECT relation_id,solution_id,relation_role,strength,status
                    FROM need_solution_relations WHERE need_id=? ORDER BY relation_id""",(need_id,)).fetchall()]
        return assets,solutions

    def save_coverage(self, target_type, target_id, result: CoverageResult, policy_version, confidence_class, assets, solutions, created_at):
        input_hash=coverage_input_hash(target_type,target_id,assets,solutions,policy_version)
        coverage_id=new_id("cov_")
        rationale={"public_max_strength":result.public_max_strength,"solution_max_strength":result.solution_max_strength,
                   "public_relation_count":result.public_relation_count,"solution_relation_count":result.solution_relation_count}
        self.db.execute("""INSERT INTO coverage_assessments
          (coverage_id,target_type,target_id,public_coverage,solution_coverage,overall_state,
           confidence_class,policy_version,input_hash,rationale_json,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)""",(coverage_id,target_type,target_id,result.public_coverage,
          result.solution_coverage,result.overall_state,confidence_class,policy_version,input_hash,
          json.dumps(rationale,sort_keys=True,separators=(",",":")),created_at))
        return coverage_id,input_hash

    def add_radar_signal(self, evidence_id, source, signal_type, occurred_at, strength, facts,
                         need_id=None,intent_id=None,solution_id=None,journey_id=None):
        signal_id=new_id("rad_")
        self.db.execute("""INSERT INTO radar_signals
          (radar_signal_id,evidence_id,source,signal_type,need_id,intent_id,solution_id,journey_id,occurred_at,strength,facts_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)""",(signal_id,evidence_id,source,signal_type,need_id,intent_id,solution_id,
          journey_id,occurred_at,strength,json.dumps(facts,sort_keys=True,separators=(",",":"))))
        return signal_id

    def add_gap(self, need_id, gap_type, confidence_class, evidence_summary_hash, created_at, created_by,
                intent_id=None,status="observe"):
        gap_id=new_id("gap_")
        self.db.execute("""INSERT INTO coverage_gaps
          (gap_id,need_id,intent_id,gap_type,status,confidence_class,evidence_summary_hash,created_at,created_by)
          VALUES (?,?,?,?,?,?,?,?,?)""",(gap_id,need_id,intent_id,gap_type,status,confidence_class,
          evidence_summary_hash,created_at,created_by))
        return gap_id
