from __future__ import annotations
import json, sqlite3
from typing import Any, Mapping

class PublisherRepository:
    def __init__(self, conn: sqlite3.Connection): self.conn=conn
    def insert_dry_run(self, plan: Mapping[str,Any], created_at: str) -> None:
        self.conn.execute(
            "INSERT OR IGNORE INTO publish_runs(publish_run_id,action_type,mode,decision_id,candidate_id,experiment_id,rollback_of_publish_run_id,baseline_commit_sha,snapshot_hash,branch_name,diff_fingerprint,status,public_write_authorized,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?)",
            (plan['publish_run_id'],plan['action'],'dry_run',plan['decision_id'],plan.get('candidate_id'),plan.get('experiment_id'),plan.get('rollback_of_publish_run_id'),plan['baseline_commit_sha'],plan['snapshot_hash'],plan['branch_name'],plan['diff_fingerprint'],'validated',created_at)
        )
        for v in plan['validations']:
            self.conn.execute(
                "INSERT OR IGNORE INTO publish_validations(publish_run_id,validation_key,passed,detail_json,validated_at) VALUES(?,?,?,?,?)",
                (plan['publish_run_id'],v['key'],1 if v['passed'] else 0,json.dumps({'detail':v['detail']},sort_keys=True),created_at)
            )
        self.conn.commit()
    def get_run(self, run_id: str):
        row=self.conn.execute("SELECT publish_run_id,action_type,mode,status,public_write_authorized FROM publish_runs WHERE publish_run_id=?",(run_id,)).fetchone()
        return row
