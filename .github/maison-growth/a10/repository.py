from __future__ import annotations
import json
import sqlite3
from typing import Any, Mapping

class A10Repository:
    """Internal datastore adapter only. It never writes the Git repository or public site."""
    def __init__(self, connection: sqlite3.Connection):
        self.db=connection

    def append_state_event(self, event: Mapping[str,Any]) -> None:
        self.db.execute(
            """INSERT INTO ocean_promotion_state_events
            (promotion_state_event_id,promotion_run_id,from_state,to_state,reason_code,evidence_refs_json,occurred_at,actor_kind,details_json)
            VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                event["promotion_state_event_id"],event["promotion_run_id"],event.get("from_state"),event["to_state"],
                event["reason_code"],json.dumps(event.get("evidence_refs",[]),sort_keys=True),
                event["occurred_at"],event.get("actor_kind","system_simulation"),
                json.dumps(event.get("details",{}),sort_keys=True)
            )
        )

    def latest_state(self, promotion_run_id: str) -> str | None:
        row=self.db.execute(
            """SELECT to_state FROM ocean_promotion_state_events
               WHERE promotion_run_id=? ORDER BY occurred_at DESC, promotion_state_event_id DESC LIMIT 1""",
            (promotion_run_id,)
        ).fetchone()
        return None if row is None else str(row[0])

    def list_validations(self, promotion_run_id: str) -> list[dict[str,Any]]:
        rows=self.db.execute(
            """SELECT validation_key,passed,detail,validated_at FROM ocean_promotion_validations
               WHERE promotion_run_id=? ORDER BY validated_at,validation_key""",(promotion_run_id,)
        ).fetchall()
        return [{"key":r[0],"passed":bool(r[1]),"detail":r[2],"validated_at":r[3]} for r in rows]
