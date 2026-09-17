#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def contracts():
 c=json.loads((ROOT/"a8-contract.json").read_text())
 p=json.loads((ROOT/"a8-permissions.json").read_text())
 pol=json.loads((ROOT/"experiment-policy.json").read_text())
 met=json.loads((ROOT/"metrics-contract.json").read_text())
 dash=json.loads((ROOT/"dashboard-read-contract.json").read_text())
 assert c["mode"]=="simulation_only" and c["principles"]["public_side_effects"] is False
 assert c["principles"]["publisher_gateway_required_for_public_execution"] is True
 assert p["default"]=="deny"
 forbidden={"repository.write","public_site.write","ocean.publish","cta.write","catalogue.write","checkout.write","price.write","discount.write","product.create","product.launch","service.create","commercial_promise.write","policy.write","legal_terms.write","oracle.content.read","paid_content.write","commercial_pii.read"}
 assert forbidden <= set(p["deny"]) and not (forbidden & set(p["allow"]))
 assert pol["default"]=="deny" and pol["allowed_change_classes"]==["cta_route_existing_solution"]
 assert pol["assignment"]["default_split"]=={"control":8000,"variant":2000}
 assert met["unit_of_eligibility"]=="eligible_session"
 assert dash["mode"]=="read_only" and dash["write_back"] is False and dash["approval_controls"] is False

def migration():
 conn=sqlite3.connect(":memory:")
 conn.executescript("""
 PRAGMA foreign_keys=ON;
 CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
 CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY);
 CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
 CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY);
 CREATE TABLE assets(asset_id TEXT PRIMARY KEY);
 CREATE TABLE conversions(conversion_id TEXT PRIMARY KEY);
 CREATE TABLE conversion_economic_assessments(economic_assessment_id TEXT PRIMARY KEY);
 CREATE TABLE events(event_id TEXT PRIMARY KEY);
 """)
 sql=(ROOT/"migrations/0006_experiment_manager.sql").read_text()
 conn.executescript(sql)
 tables={r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
 required={"experiments","experiment_versions","experiment_variants","experiment_snapshots","experiment_state_events","experiment_compatibility_claims","experiment_exposures","experiment_metric_observations","experiment_results","experiment_rollbacks"}
 assert required<=tables
 row=conn.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a8_schema_version'").fetchone()
 assert row and row[0]=="A8.1"
 low=sql.lower()
 for phrase in ("publisher_gateway_required integer not null default 1 check (publisher_gateway_required = 1)","public_side_effects integer not null default 0 check (public_side_effects = 0)","immutable"):
  assert phrase in low

def no_public_paths():
 src=(ROOT/"experiment_manager.py").read_text().lower()+(ROOT/"repository.py").read_text().lower()
 for token in ("indexnow","sitemap","functions/api","_redirects","checkout-session-live","github"):
  assert token not in src

def tests():
 proc=subprocess.run([sys.executable,str(ROOT/"test_a8.py")],cwd=ROOT,text=True,capture_output=True)
 if proc.returncode:
  print(proc.stdout); print(proc.stderr,file=sys.stderr); raise SystemExit(proc.returncode)
 print(proc.stderr.strip())

if __name__=="__main__":
 contracts(); migration(); no_public_paths(); tests(); print("A8 contracts: OK")
