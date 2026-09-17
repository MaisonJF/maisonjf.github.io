#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
from typing import Any, Mapping


class A7Repository:
    """Persistence adapter for A7 internal records only. No public-site capability."""
    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    def save_decision(self, row: Mapping[str, Any]) -> None:
        required = {"decision_id","decision_run_id","subject_type","subject_id","decision_type","hard_gates_passed","confidence_score","reason_codes","evidence_refs","evaluation_order","input_hash","rule_version_id","created_at"}
        missing = required - set(row)
        if missing:
            raise ValueError(f"missing decision fields: {sorted(missing)}")
        self.connection.execute(
            """INSERT INTO decision_records(
                decision_id,decision_run_id,subject_type,subject_id,decision_type,hard_gates_passed,
                discovery_score,commercial_score,confidence_score,reason_codes_json,evidence_refs_json,
                recommended_solution_id,human_review_required,public_side_effects,evaluation_order_json,input_hash,
                rule_version_id,model_version_id,created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                row["decision_id"],row["decision_run_id"],row["subject_type"],row["subject_id"],row["decision_type"],int(row["hard_gates_passed"]),
                row.get("discovery_score"),row.get("commercial_score"),row["confidence_score"],json.dumps(row["reason_codes"]),json.dumps(row["evidence_refs"]),
                row.get("recommended_solution_id"),int(bool(row.get("human_review_required",False))),0,json.dumps(row["evaluation_order"]),row["input_hash"],
                row["rule_version_id"],row.get("model_version_id"),row["created_at"]
            )
        )
