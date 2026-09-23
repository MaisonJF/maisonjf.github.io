#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def ok(condition, message):
    if not condition:
        raise AssertionError(message)


def load(name):
    return json.loads((ROOT/name).read_text(encoding="utf-8"))


def contracts():
    contract=load("a12-contract.json")
    permissions=load("a12-permissions.json")
    policy=load("autonomy-policy.json")
    manifest=load("migration-manifest.json")

    ok(contract["contract_version"]=="A12.2","A12 contract must be A12.2")
    ok(contract["mode"]=="simulation_only","A12 must be simulation only")
    ok(contract["public_write_authorized"] is False,"public write disabled")
    ok(contract["autonomous_public_write_authorized"] is False,"public autonomy disabled")
    ok(contract["automatic_execution_risk_max"]=="low","only low risk may auto")
    ok(contract["human_review_resolution_append_only"] is True,"human review resolution must be append-only")
    ok(contract["commercial_review_approval_scope"]=="experiment_planning_only","approval scope drift")
    ok(contract["commercial_review_execution_authorized"] is False,"commercial review must not execute experiments")

    ok(permissions["default"]=="deny","deny by default")
    ok(permissions["autonomous_public_write_authorized"] is False,"permission public autonomy disabled")
    for denied in (
        "repository.write","public_site.autonomous_write","price.write","checkout.write",
        "catalogue.write","hard_gates.write","permissions.write","public_authorization.write",
    ):
        ok(denied in permissions["deny"],f"missing deny {denied}")

    ok(policy["global_kill_switch_default"] is True,"kill switch must default on")
    ok(policy["public_autonomy_enabled"] is False,"public autonomy must be false")
    ok(policy["risk_rules"]["commercial_opportunity_review"]=="medium","commercial review risk drift")

    ok(manifest["contract_version"]=="A12.2","A12 migration manifest must be A12.2")
    orders=[row["order"] for row in manifest["migrations"]]
    ok(orders==[10,15],"A12 migration order must be 10,15")
    for row in manifest["migrations"]:
        path=ROOT/row["path"]
        ok(path.exists(),f"missing migration {path}")
        ok(hashlib.sha256(path.read_bytes()).hexdigest()==row["sha256"],f"migration hash mismatch {path.name}")


def sql_validation():
    sql10=(ROOT/"migrations/0010_gradual_autonomy_dashboard_v2.sql").read_text(encoding="utf-8")
    sql15=(ROOT/"migrations/0015_human_commercial_review_resolution.sql").read_text(encoding="utf-8")
    for token in (
        "public_write_authorized=0",
        "public_side_effects=0",
        "autonomy_level<>'low_risk_auto' OR risk_class='low'",
        "state_key<>'public_autonomy'",
    ):
        ok(token in sql10,f"missing A12.1 guard {token}")
    for token in (
        "approved_scope='experiment_planning_only'",
        "public_write_authorized=0",
        "outbound_authorized=0",
        "spend_authorized=0",
        "experiment_execution_authorized=0",
        "actor_kind='human'",
    ):
        ok(token in sql15,f"missing A12.2 guard {token}")

    db=sqlite3.connect(":memory:")
    db.executescript("""PRAGMA foreign_keys=ON;
    CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
    CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY);
    CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
    CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY);
    CREATE TABLE experiment_results(experiment_result_id TEXT PRIMARY KEY);
    CREATE TABLE publish_runs(publish_run_id TEXT PRIMARY KEY);
    CREATE TABLE ocean_promotion_runs(promotion_run_id TEXT PRIMARY KEY);
    CREATE TABLE learning_records(learning_record_id TEXT PRIMARY KEY);""")
    db.executescript(sql10)
    db.executescript(sql15)

    expected={
        "autonomy_job_definitions","autonomy_job_runs","autonomy_lock_events",
        "autonomy_state_events","autonomy_action_log","autonomy_human_queue",
        "autonomy_health_checks","autonomy_alerts","autonomy_human_review_resolutions",
    }
    got={row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    ok(expected<=got,"missing A12 tables")
    views={row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='view'")}
    ok("autonomy_human_queue_current" in views,"missing A12.2 current-queue view")

    rule_id="rul_"+"a"*36
    db.execute("INSERT INTO rule_versions VALUES (?)",(rule_id,))
    job_id="job_"+"b"*36
    db.execute(
        """INSERT INTO autonomy_job_definitions
           (autonomy_job_id,job_key,action_key,risk_class,autonomy_level,schedule_key,
            min_evidence_count,min_confidence_score,max_actions_per_window,
            rule_version_id,model_version_id,created_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
        (job_id,"health-hourly","internal_health_check","low","low_risk_auto","hourly",
         2,80,10,rule_id,None,"2026-09-17T00:00:00Z"),
    )
    try:
        db.execute(
            """INSERT INTO autonomy_job_definitions
               (autonomy_job_id,job_key,action_key,risk_class,autonomy_level,schedule_key,
                min_evidence_count,min_confidence_score,max_actions_per_window,
                rule_version_id,model_version_id,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            ("job_"+"c"*36,"bad","public_content_write","high","low_risk_auto","hourly",
             2,80,10,rule_id,None,"2026-09-17T00:00:00Z"),
        )
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("high risk low_risk_auto accepted")

    try:
        db.execute("UPDATE autonomy_job_definitions SET schedule_key='daily' WHERE autonomy_job_id=?",(job_id,))
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("job update allowed")

    action_id="act_"+"d"*36
    queue_id="inq_"+"e"*36
    resolution_id="rvr_"+"f"*36
    db.execute(
        """INSERT INTO autonomy_action_log(
             action_id,autonomy_run_id,action_key,risk_class,autonomy_level,
             decision_id,experiment_result_id,publish_run_id,promotion_run_id,learning_record_id,
             evidence_refs_json,reason_codes_json,result_json,rollback_ref,
             public_write_authorized,public_side_effects,created_at
           ) VALUES(?,NULL,?,'medium','human_approval_required',NULL,NULL,NULL,NULL,NULL,?,?,?,NULL,0,0,?)""",
        (action_id,"commercial_opportunity_review",'["evd_x"]','["HUMAN_APPROVAL_REQUESTED"]',
         '{"offer_hypothesis_id":"ofh_fixture"}',"2026-09-23T17:00:00Z"),
    )
    db.execute(
        """INSERT INTO autonomy_human_queue(queue_id,action_id,priority,status,reason_codes_json,created_at)
           VALUES(?,?,50,'pending','["commercial_review"]',?)""",
        (queue_id,action_id,"2026-09-23T17:00:01Z"),
    )
    db.execute(
        """INSERT INTO autonomy_human_review_resolutions(
             review_resolution_id,queue_id,action_id,decision,approved_scope,
             decision_reason,evidence_refs_json,actor_kind,decided_at
           ) VALUES(?,?,?,'approved','experiment_planning_only',?,'["human:review"]','human',?)""",
        (resolution_id,queue_id,action_id,"Teste aprovado para planeamento","2026-09-23T17:05:00Z"),
    )
    row=db.execute(
        """SELECT effective_status,approved_scope,public_write_authorized,
                  outbound_authorized,spend_authorized,experiment_execution_authorized
           FROM autonomy_human_queue_current WHERE queue_id=?""",
        (queue_id,),
    ).fetchone()
    ok(row==("approved","experiment_planning_only",0,0,0,0),"approval escaped planning-only boundary")

    try:
        db.execute(
            "UPDATE autonomy_human_review_resolutions SET decision='rejected' WHERE review_resolution_id=?",
            (resolution_id,),
        )
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("human review resolution update allowed")


def main():
    contracts()
    sql_validation()
    proc=subprocess.run(
        [sys.executable,str(ROOT/"test_a12.py")],
        cwd=str(ROOT),capture_output=True,text=True,
    )
    if proc.returncode:
        print(proc.stdout)
        print(proc.stderr,file=sys.stderr)
        raise SystemExit(proc.returncode)
    print(proc.stderr,end="")
    print("A12 Gradual Autonomy + Dashboard v2: OK")


if __name__=="__main__":
    main()
