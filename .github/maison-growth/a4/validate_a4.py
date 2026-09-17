#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
REPO_ROOT=ROOT.parents[2]

def fail(msg):
    print("A4 validation FAILED:",msg,file=sys.stderr); raise SystemExit(1)

def main():
    contract=json.loads((ROOT/"a4-contract.json").read_text())
    perms=json.loads((ROOT/"a4-permissions.json").read_text())
    radar=json.loads((ROOT/"radar-source-contract.json").read_text())
    manifest=json.loads((ROOT/"migration-manifest.json").read_text())
    migration=(ROOT/"migrations"/"0003_living_map_radar.sql").read_text()

    if contract.get("mode")!="analysis_only": fail("A4 must be analysis_only")
    iso=contract["runtime_isolation"]
    for key in ("public_site_dependency","public_site_write","repository_write","publisher_available","cta_mutation","commercial_catalog_mutation"):
        if iso.get(key) is not False: fail(f"{key} must be false")
    if perms.get("default")!="deny": fail("permissions must deny by default")
    serialized=json.dumps(perms)
    for forbidden in ("oracle.content.read","commercial_pii.read"):
        if forbidden not in serialized: fail(f"missing explicit forbidden permission {forbidden}")
    if radar.get("default")!="deny": fail("Radar must deny unknown sources")
    if radar["sources"]["oracle"].get("paid_answer_text") is not False: fail("Oracle paid text must be forbidden")
    if radar["sources"]["gsc"].get("raw_query_text") is not False: fail("raw GSC query text must be forbidden")
    actual=hashlib.sha256(migration.encode()).hexdigest()
    if actual!=manifest.get("sha256"): fail("migration hash mismatch")

    for token in ("CREATE TABLE needs","CREATE TABLE intents","CREATE TABLE assets","CREATE TABLE map_evidence",
                  "CREATE TABLE coverage_assessments","CREATE TABLE coverage_gaps","CREATE TABLE radar_signals"):
        if token not in migration: fail("migration missing "+token)

    proc=subprocess.run([sys.executable,str(ROOT/"test_a4.py")],cwd=ROOT,text=True,capture_output=True)
    if proc.returncode:
        print(proc.stdout); print(proc.stderr,file=sys.stderr); fail("automatic tests failed")
    tests=sum(1 for line in proc.stderr.splitlines() if line.strip().endswith("... ok"))
    print(proc.stderr.strip())
    print(f"A4 contracts: OK; automatic tests passed ({tests})")

if __name__=="__main__": main()
