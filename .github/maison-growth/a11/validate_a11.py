#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3, subprocess, sys, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parent
SEED=ROOT/"migrations/0020_learning_rule_seed.sql"

def ok(c,m):
    if not c: raise AssertionError(m)

def load(n):
    return json.loads((ROOT/n).read_text(encoding="utf-8"))

def contracts():
    c=load("a11-contract.json")
    p=load("a11-permissions.json")
    pol=load("learning-policy.json")
    manifest=load("migration-manifest.json")
    canonical_policy=json.dumps(pol,sort_keys=True,separators=(",",":"),ensure_ascii=False)
    policy_hash=hashlib.sha256(canonical_policy.encode("utf-8")).hexdigest()
    expected_rule_id="rul_"+policy_hash[:36]
    seed_sql=SEED.read_text(encoding="utf-8")
    ok(pol["policy_version"]=="A11.2","learning policy must be A11.2")
    ok(pol["initial_confidence"]==50,"A11 initial confidence baseline must be explicit")
    ok(expected_rule_id in seed_sql,"A11 seed rule id does not match policy hash")
    ok(policy_hash in seed_sql,"A11 seed definition hash does not match policy")
    ok(canonical_policy in seed_sql,"A11 seed definition JSON does not match policy")
    ok(c["mode"]=="analysis_only","A11 must be analysis only")
    ok(c["public_write_authorized"] is False,"public write forbidden")
    ok(c["economic_outcomes_priority_over_clicks"] is True,"economics must dominate clicks")
    ok(c["causal_inference_authorized"] is False,"causal inference must be disabled")
    ok(c["self_reprogramming_authorized"] is False,"self-reprogramming must be disabled")
    ok("content" in c["learning_inputs"],"content learning input missing")
    ok(c.get("content_economics_owner")=="A3","A3 must own content economics")
    ok(c.get("content_engagement_can_mutate_economic_confidence") is False,"engagement cannot mutate economic confidence")
    ok(p["default"]=="deny","permissions must deny by default")
    ok("growth.content_performance.read" in p["allow"],"content performance read permission missing")
    for x in [
        "repository.write","public_site.write","hard_gates.write","permissions.write",
        "price.write","checkout.write","catalogue.write","paid_content.read",
        "policy.write","public_authorization.write",
    ]:
        ok(x in p["deny"],f"missing deny {x}")
    ok(pol["pattern_detection"]["causal_claims"] is False,"patterns cannot assert causality")
    ok(pol["sensitive_proposal_execution_authorized"] is False,"sensitive proposals cannot execute")
    ok(manifest["manifest_version"]=="A11.2","A11 manifest must be A11.2")
    ok([x["order"] for x in manifest["migrations"]]==[9,19],"unexpected A11 migration order")
    for entry in manifest["migrations"]:
        migration=ROOT/entry["path"]
        ok(migration.exists(),f"missing migration {migration}")
        ok(hashlib.sha256(migration.read_bytes()).hexdigest()==entry["sha256"],f"migration hash mismatch: {entry['path']}")

def prerequisite_db():
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
    return db

def sql_validation():
    base_sql=(ROOT/"migrations/0009_learning_engine.sql").read_text(encoding="utf-8")
    content_sql=(ROOT/"migrations/0019_content_learning_source.sql").read_text(encoding="utf-8")
    combined=base_sql+"\n"+content_sql
    for token in [
        "public_side_effects=0","causal_claim=0","execution_authorized=0",
        "human_review_required","source_kind='content'","A11.2",
    ]:
        ok(token in combined,f"missing structural guard {token}")

    db=prerequisite_db()
    db.executescript(base_sql)
    ver=db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a11_schema_version'").fetchone()
    ok(ver and ver[0]=="A11.1","base A11.1 schema version missing")

    rul="rul_"+"a"*36
    lru="lru_"+"b"*36
    dec="dec_"+"e"*36
    lsl="lsl_"+"f"*36
    lrn="lrn_"+"7"*36
    db.execute("INSERT INTO rule_versions VALUES (?)",(rul,))
    db.execute("INSERT INTO decision_records VALUES (?)",(dec,))
    db.execute("""INSERT INTO learning_runs(
      learning_run_id,rule_version_id,model_version_id,policy_version,input_hash,
      started_at,completed_at,input_count
    ) VALUES (?,?,?,?,?,?,?,?)""",(lru,rul,None,"A11.1","c"*64,
      "2026-09-17T00:00:00Z","2026-09-17T00:00:01Z",1))
    db.execute("""INSERT INTO learning_source_links(
      learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,
      source_snapshot_hash,observed_at
    ) VALUES (?,?,?,?,?,?,?)""",(lsl,lru,"decision",dec,dec,"1"*64,"2026-09-17T00:00:01Z"))
    db.execute("""INSERT INTO learning_records(
      learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,
      subject_type,subject_id,signal_class,expected_json,observed_json,economic_value_minor,
      ctr_bps,confidence_before,confidence_after,confidence_delta,reason_codes_json,
      evidence_refs_json,correlation_only,causal_claim,rule_version_id,model_version_id,
      input_hash,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(
      lrn,lru,lsl,"decision",dec,"decision",dec,"positive","{}","{}",
      1000,500,50,60,10,'["ECONOMIC_OUTCOME_ABOVE_EXPECTATION"]','["ev1"]',
      1,0,rul,None,"7"*64,"2026-09-17T00:00:02Z"
    ))
    db.commit()

    db.executescript(content_sql)
    db.executescript(SEED.read_text(encoding="utf-8"))
    ver=db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a11_schema_version'").fetchone()
    ok(ver and ver[0]=="A11.2","A11.2 schema version missing")
    rule=db.execute("SELECT family,version_label,definition_hash,definition_json FROM rule_versions WHERE rule_version_id=?",(expected_rule_id,)).fetchone()
    ok(rule is not None,"canonical A11.2 learning rule missing")
    ok(rule[0:3]==("learning","A11.2",policy_hash),"canonical A11.2 learning rule metadata mismatch")
    ok(json.loads(rule[3])==pol,"canonical A11.2 learning rule definition mismatch")
    ok(db.execute("SELECT source_kind FROM learning_records WHERE learning_record_id=?",(lrn,)).fetchone()==("decision",),
       "A11.1 learning record was not preserved by 0019")

    try:
        db.execute("""INSERT INTO learning_source_links(
          learning_source_link_id,learning_run_id,source_kind,source_id,decision_id,
          source_snapshot_hash,observed_at
        ) VALUES (?,?,?,?,?,?,?)""",("lsl_"+"9"*36,lru,"experiment",dec,dec,"2"*64,"2026-09-17T00:00:03Z"))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("source-kind compatibility guard failed after A11.2")

    cnt="cnt_"+"8"*36
    can="can_"+"6"*36
    csl="lsl_"+"5"*36
    clr="lrn_"+"4"*36
    db.execute("""INSERT INTO learning_source_links(
      learning_source_link_id,learning_run_id,source_kind,source_id,
      source_snapshot_hash,observed_at,evidence_refs_json
    ) VALUES (?,?,?,?,?,?,?)""",(csl,lru,"content",cnt,"3"*64,
      "2026-09-18T00:00:00Z",'["a1:event:content-performance"]'))
    db.execute("""INSERT INTO learning_records(
      learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,
      subject_type,subject_id,signal_class,expected_json,observed_json,economic_value_minor,
      ctr_bps,confidence_before,confidence_after,confidence_delta,reason_codes_json,
      evidence_refs_json,correlation_only,causal_claim,rule_version_id,model_version_id,
      input_hash,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",(
      clr,lru,csl,"content",cnt,"candidate",can,"insufficient","{}",
      '{"click_rate_bps":700}',None,700,60,60,0,'["CONTENT_OBSERVATION_ONLY"]',
      '["a1:event:content-performance"]',1,0,rul,None,"4"*64,"2026-09-18T00:00:01Z"
    ))
    ok(db.execute("SELECT economic_value_minor,ctr_bps FROM learning_records WHERE learning_record_id=?",(clr,)).fetchone()==(None,700),
       "content learning must preserve non-economic observation semantics")

    try:
        db.execute("UPDATE learning_records SET confidence_after=70 WHERE learning_record_id=?",(clr,))
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("A11.2 learning history was mutable")

    try:
        db.execute("UPDATE learning_source_links SET observed_at='x' WHERE learning_source_link_id=?",(csl,))
    except sqlite3.DatabaseError:
        pass
    else:
        raise AssertionError("A11.2 source links were mutable")

    try:
        db.execute("""INSERT INTO learning_sensitive_proposals(
          proposal_id,protected_domain,recommendation,reason_code,evidence_refs_json,status,
          execution_authorized,public_side_effects,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?)""",("lpr_"+"d"*36,"hard_gates","x",
          "SENSITIVE_RULE_CHANGE_REQUIRES_HUMAN","[]","human_review_required",1,0,
          "2026-09-17T00:00:00Z"))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("sensitive proposal execution was authorized")

    ok(list(db.execute("PRAGMA foreign_key_check"))==[],"foreign key integrity failed after A11.2")
    tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    expected={"learning_runs","learning_source_links","learning_records","learning_feedback","learning_patterns","learning_sensitive_proposals"}
    ok(expected<=tables,"missing A11 tables")

def main():
    contracts()
    sql_validation()
    for test_file in ("test_a11.py","test_content_bridge.py"):
        p=subprocess.run([sys.executable,str(ROOT/test_file)],cwd=str(ROOT),capture_output=True,text=True)
        if p.returncode:
            print(p.stdout)
            print(p.stderr,file=sys.stderr)
            raise SystemExit(p.returncode)
        print(p.stderr,end="")
    print("A11 Learning Engine: OK")

if __name__=="__main__":
    main()
