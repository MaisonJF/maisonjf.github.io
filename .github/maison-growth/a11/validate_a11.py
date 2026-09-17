#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3, subprocess, sys, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def ok(c,m):
    if not c: raise AssertionError(m)
def load(n): return json.loads((ROOT/n).read_text(encoding="utf-8"))

def contracts():
    c=load("a11-contract.json"); p=load("a11-permissions.json"); pol=load("learning-policy.json"); manifest=load("migration-manifest.json")
    ok(c["mode"]=="analysis_only","A11 must be analysis only")
    ok(c["public_write_authorized"] is False,"public write forbidden")
    ok(c["economic_outcomes_priority_over_clicks"] is True,"economics must dominate clicks")
    ok(c["causal_inference_authorized"] is False,"causal inference must be disabled")
    ok(c["self_reprogramming_authorized"] is False,"self-reprogramming must be disabled")
    ok(p["default"]=="deny","permissions must deny by default")
    for x in ["repository.write","public_site.write","hard_gates.write","permissions.write","price.write","checkout.write","catalogue.write","paid_content.read","policy.write","public_authorization.write"]:
        ok(x in p["deny"],f"missing deny {x}")
    ok(pol["pattern_detection"]["causal_claims"] is False,"patterns cannot assert causality")
    ok(pol["sensitive_proposal_execution_authorized"] is False,"sensitive proposals cannot execute")
    migration=ROOT/manifest["migrations"][0]["path"]
    ok(hashlib.sha256(migration.read_bytes()).hexdigest()==manifest["migrations"][0]["sha256"],"migration hash mismatch")

def sql_validation():
    sql=(ROOT/"migrations/0009_learning_engine.sql").read_text(encoding="utf-8")
    for token in ["public_side_effects=0","causal_claim=0","execution_authorized=0","human_review_required"]:
        ok(token in sql,f"missing structural guard {token}")
    db=sqlite3.connect(":memory:")
    db.executescript("""PRAGMA foreign_keys=ON;
      CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
      CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY);
      CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
      CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY);
      CREATE TABLE experiment_results(experiment_result_id TEXT PRIMARY KEY);
      CREATE TABLE journey_snapshots(journey_snapshot_id TEXT PRIMARY KEY);
      CREATE TABLE conversions(conversion_id TEXT PRIMARY KEY);
      CREATE TABLE conversion_economic_assessments(economic_assessment_id TEXT PRIMARY KEY);
      CREATE TABLE ocean_promotion_runs(promotion_run_id TEXT PRIMARY KEY);""")
    db.executescript(sql)
    tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    expected={"learning_runs","learning_source_links","learning_records","learning_feedback","learning_patterns","learning_sensitive_proposals"}
    ok(expected<=tables,"missing A11 tables")
    ver=db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a11_schema_version'").fetchone()
    ok(ver and ver[0]=="A11.1","schema version missing")
    rul="rul_"+"a"*36; db.execute("INSERT INTO rule_versions VALUES (?)",(rul,))
    lru="lru_"+"b"*36
    db.execute("""INSERT INTO learning_runs(learning_run_id,rule_version_id,model_version_id,policy_version,input_hash,started_at,completed_at,input_count)
      VALUES (?,?,?,?,?,?,?,?)""",(lru,rul,None,"A11.1","c"*64,"2026-09-17T00:00:00Z","2026-09-17T00:00:01Z",1))
    dec="dec_"+"e"*36; db.execute("INSERT INTO decision_records VALUES (?)",(dec,))
    lsl="lsl_"+"f"*36
    db.execute("""INSERT INTO learning_source_links(learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,source_snapshot_hash,observed_at)
      VALUES (?,?,?,?,?,?,?)""",(lsl,lru,"decision",dec,dec,"1"*64,"2026-09-17T00:00:01Z"))
    try:
        db.execute("""INSERT INTO learning_source_links(learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,source_snapshot_hash,observed_at)
          VALUES (?,?,?,?,?,?,?)""",("lsl_"+"9"*36,lru,"experiment",dec,dec,"2"*64,"2026-09-17T00:00:01Z"))
    except sqlite3.IntegrityError: pass
    else: raise AssertionError("source-kind compatibility guard failed")
    try: db.execute("UPDATE learning_runs SET input_count=2 WHERE learning_run_id=?",(lru,))
    except sqlite3.DatabaseError: pass
    else: raise AssertionError("learning run update was allowed")
    try: db.execute("""INSERT INTO learning_sensitive_proposals(proposal_id,protected_domain,recommendation,reason_code,evidence_refs_json,status,execution_authorized,public_side_effects,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)""",("lpr_"+"d"*36,"hard_gates","x","SENSITIVE_RULE_CHANGE_REQUIRES_HUMAN","[]","human_review_required",1,0,"2026-09-17T00:00:00Z"))
    except sqlite3.IntegrityError: pass
    else: raise AssertionError("sensitive proposal execution was authorized")

def main():
    contracts(); sql_validation()
    p=subprocess.run([sys.executable,str(ROOT/"test_a11.py")],cwd=str(ROOT),capture_output=True,text=True)
    if p.returncode:
        print(p.stdout); print(p.stderr,file=sys.stderr); raise SystemExit(p.returncode)
    print(p.stderr,end="")
    print("A11 Learning Engine: OK")

if __name__=="__main__": main()
