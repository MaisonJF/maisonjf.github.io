#!/usr/bin/env python3
from __future__ import annotations

import json
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

from brain import SemanticAnalysis, CoverageResolution, privacy_scan

def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")

def _uuid7() -> uuid.UUID:
    ms = int(time.time()*1000) & ((1<<48)-1)
    value = (ms<<80) | (0x7<<76) | (secrets.randbits(12)<<64) | (0b10<<62) | secrets.randbits(62)
    return uuid.UUID(int=value)

def new_id(prefix: str) -> str:
    if len(prefix) != 4 or not prefix.endswith("_"):
        raise ValueError("prefix must be three characters plus underscore")
    return prefix + str(_uuid7())

def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",",":"), ensure_ascii=False)

class SQLiteA5Repository:
    """Local/D1-compatible A5 persistence port. Does not touch public Maison data."""
    def __init__(self, connection: sqlite3.Connection):
        self.db = connection
        self.db.execute("PRAGMA foreign_keys=ON")
    def create_run(self, *, run_kind: str, rule_version_id: str, model_version_id: Optional[str], provider_name: str, provider_version: str, input_hash: str, input_count: int) -> str:
        rid = new_id("brn_"); ts = now_utc()
        self.db.execute("INSERT INTO brain_runs(brain_run_id,run_kind,rule_version_id,model_version_id,provider_name,provider_version,input_hash,started_at,completed_at,input_count) VALUES(?,?,?,?,?,?,?,?,?,?)",(rid,run_kind,rule_version_id,model_version_id,provider_name,provider_version,input_hash,ts,ts,input_count))
        self.db.commit(); return rid
    def persist_observation(self, *, brain_run_id: str, analysis: SemanticAnalysis, source_kind: str, rule_version_id: str, model_version_id: Optional[str], source_evidence_id: Optional[str]=None, need_id: Optional[str]=None, intent_id: Optional[str]=None) -> str:
        privacy_scan(analysis.normalized_phrase)
        oid = new_id("sob_"); phrase_hash = __import__("hashlib").sha256(analysis.normalized_phrase.encode("utf-8")).hexdigest()
        self.db.execute("""INSERT INTO semantic_observations
        (semantic_observation_id,brain_run_id,source_kind,source_evidence_id,need_id,intent_id,normalized_phrase,phrase_hash,semantic_signature,semantic_fingerprint,ambiguity,confidence_score,provider_name,provider_version,rule_version_id,model_version_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(oid,brain_run_id,source_kind,source_evidence_id,need_id,intent_id,analysis.normalized_phrase,phrase_hash,"|".join(analysis.signature_tokens),analysis.semantic_fingerprint,int(analysis.ambiguity),analysis.confidence_score,analysis.provider_name,analysis.provider_version,rule_version_id,model_version_id,now_utc()))
        self.db.commit(); return oid
    def persist_coverage(self, *, brain_run_id: str, target_type: str, target_id: str, result: CoverageResolution, rule_version_id: str, model_version_id: Optional[str]) -> str:
        cid = new_id("cvr_")
        self.db.execute("""INSERT INTO coverage_resolutions
        (coverage_resolution_id,brain_run_id,target_type,target_id,public_coverage,solution_coverage,conclusion_state,confidence_score,reason_codes_json,evidence_refs_json,input_hash,rule_version_id,model_version_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(cid,brain_run_id,target_type,target_id,result.public_coverage,result.solution_coverage,result.state,result.confidence_score,_json(result.reason_codes),_json(result.evidence_refs),result.input_hash,rule_version_id,model_version_id,now_utc()))
        self.db.commit(); return cid
    def persist_candidate(self, *, brain_run_id: str, candidate: Mapping[str,Any], cluster_id: Optional[str], need_id: Optional[str], intent_id: Optional[str], rule_version_id: str, model_version_id: Optional[str]) -> str:
        privacy_scan(candidate.get("context",{})); cid = new_id("can_")
        self.db.execute("""INSERT INTO internal_candidates
        (internal_candidate_id,brain_run_id,candidate_kind,semantic_cluster_id,need_id,intent_id,state,confidence_score,reason_codes_json,evidence_refs_json,context_json,input_hash,rule_version_id,model_version_id,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(cid,brain_run_id,candidate["candidate_kind"],cluster_id,need_id,intent_id,candidate["state"],candidate["confidence_score"],_json(candidate["reason_codes"]),_json(candidate["evidence_refs"]),_json(candidate.get("context",{})),candidate["input_hash"],rule_version_id,model_version_id,now_utc()))
        self.db.commit(); return cid
