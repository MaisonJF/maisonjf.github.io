#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def must(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit("A5 validation failed: "+message)

contract=json.loads((ROOT/"a5-contract.json").read_text(encoding="utf-8"))
perms=json.loads((ROOT/"a5-permissions.json").read_text(encoding="utf-8"))
provider=json.loads((ROOT/"semantic-provider-contract.json").read_text(encoding="utf-8"))
policy=json.loads((ROOT/"brain-policy.json").read_text(encoding="utf-8"))
migration=(ROOT/"migrations/0004_brain.sql").read_text(encoding="utf-8")

must(contract["mode"]=="analysis_only","module must remain analysis_only")
must(contract["capabilities"]["publishing"] is False,"publishing must be false")
must(contract["capabilities"]["cta_changes"] is False,"CTA changes must be false")
must(contract["capabilities"]["catalogue_changes"] is False,"catalogue changes must be false")
must(perms["default"]=="deny","permissions must be deny-by-default")
for denied in ("repository.write","public_site.write","oracle.content.read","oracle.paid_text.read","commercial_pii.read","indexnow.write","cta.write","catalogue.write"):
    must(denied in perms["deny"],f"missing deny {denied}")
must(provider["security"]["paid_oracle_content"]=="reject","paid Oráculo text must be rejected")
must(policy["default"]=="deny","brain policy must be deny-by-default")
for forbidden in ("CREATE TABLE html","sitemap","IndexNow","_redirects","checkout"):
    must(forbidden.lower() not in migration.lower(),f"migration unexpectedly references protected surface {forbidden}")

db=sqlite3.connect(":memory:")
db.executescript("""
PRAGMA foreign_keys=ON;
CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY, schema_value TEXT NOT NULL, recorded_at TEXT);
CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY);
CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
CREATE TABLE map_evidence(evidence_id TEXT PRIMARY KEY);
CREATE TABLE needs(need_id TEXT PRIMARY KEY);
CREATE TABLE intents(intent_id TEXT PRIMARY KEY);
""")
db.executescript(migration)
must(db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a5_schema_version'").fetchone()[0]=="A5.1","schema marker missing")

result=subprocess.run([sys.executable,str(ROOT/"test_a5.py")],cwd=str(ROOT),capture_output=True,text=True)
if result.returncode:
    print(result.stdout); print(result.stderr,file=sys.stderr); raise SystemExit(result.returncode)
count=sum(1 for line in result.stderr.splitlines() if line.startswith("test_"))
must(count>=25,f"expected at least 25 tests, saw {count}")
print(f"A5 contracts: OK ({count} tests)")
