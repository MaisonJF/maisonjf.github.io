#!/usr/bin/env python3
from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Any

class ReadOnlyIntegration:
    """Read-only A3/A7 integration. No public writes and no A8 runtime mutation."""
    def __init__(self, db_path:str|Path):
        self.conn=sqlite3.connect(f"file:{Path(db_path)}?mode=ro",uri=True)
        self.conn.row_factory=sqlite3.Row
        self.conn.execute("PRAGMA query_only=ON")
    def decision(self, decision_id:str)->dict[str,Any]|None:
        row=self.conn.execute("""SELECT decision_id,decision_type,hard_gates_passed,discovery_score,
            commercial_score,confidence_score,reason_codes_json,evidence_refs_json,
            recommended_solution_id,rule_version_id,model_version_id
            FROM decision_records WHERE decision_id=?""",(decision_id,)).fetchone()
        return dict(row) if row else None
    def economic_assessments_for_journey(self, journey_id:str)->list[dict[str,Any]]:
        rows=self.conn.execute("""SELECT c.journey_id,c.solution_id,e.immediate_contribution_minor,
            e.continuation_expected_value_minor,e.expected_total_value_minor,e.confidence_class
            FROM conversions c JOIN conversion_economic_assessments e ON e.conversion_id=c.conversion_id
            WHERE c.journey_id=? ORDER BY e.created_at""",(journey_id,)).fetchall()
        return [dict(r) for r in rows]
    def close(self)->None: self.conn.close()
