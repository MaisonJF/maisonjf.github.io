#!/usr/bin/env python3
from __future__ import annotations
import sqlite3
from typing import Any, Mapping

class LearningRepository:
    def __init__(self, conn:sqlite3.Connection):
        self.conn=conn
    def append_record(self,row:Mapping[str,Any])->None:
        self.conn.execute("""INSERT INTO learning_records(
          learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,subject_type,subject_id,signal_class,
          expected_json,observed_json,economic_value_minor,ctr_bps,confidence_before,confidence_after,
          confidence_delta,reason_codes_json,evidence_refs_json,correlation_only,causal_claim,
          rule_version_id,model_version_id,input_hash,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", tuple(row[k] for k in (
          "learning_record_id","learning_run_id","learning_source_link_id","source_kind","source_id","subject_type","subject_id","signal_class",
          "expected_json","observed_json","economic_value_minor","ctr_bps","confidence_before","confidence_after",
          "confidence_delta","reason_codes_json","evidence_refs_json","correlation_only","causal_claim",
          "rule_version_id","model_version_id","input_hash","created_at")))
    def list_for_subject(self,subject_type:str,subject_id:str):
        return self.conn.execute("""SELECT learning_record_id,signal_class,confidence_delta,reason_codes_json,created_at
          FROM learning_records WHERE subject_type=? AND subject_id=? ORDER BY created_at,learning_record_id""",(subject_type,subject_id)).fetchall()
