#!/usr/bin/env python3
from __future__ import annotations
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def must(cond,msg):
    if not cond: raise SystemExit("A6 validation failed: "+msg)

def main():
    contract=json.loads((ROOT/"a6-contract.json").read_text())
    permissions=json.loads((ROOT/"a6-permissions.json").read_text())
    data_contract=json.loads((ROOT/"dashboard-data-contract.json").read_text())
    must(contract["mode"]=="read_only_internal","dashboard mode")
    must(contract["runtime_isolation"]["public_site_dependency"] is False,"public dependency")
    must(contract["runtime_isolation"]["public_site_write"] is False,"public write")
    must(permissions["default"]=="deny","deny by default")
    for cap in ("public_site.write","repository.write","catalog.write","cta.write","oracle.content.read","commercial_pii.read"):
        must(cap in permissions["deny"],f"missing deny {cap}")
    must(permissions["future_runtime"]["authentication_required"] is True,"future auth")
    must(permissions["future_runtime"]["public_access"] is False,"public access must be false")
    forbidden=set(data_contract["oracle_aggregates"]["forbidden_fields"])
    must({"answer_text","reading_text","email"}.issubset(forbidden),"Oracle privacy contract")
    source=(ROOT/"serve_local.py").read_text()
    must('"0.0.0.0"' not in source,"must not bind wildcard")
    must("do_POST=_deny" in source and "do_DELETE=_deny" in source,"write HTTP methods must be denied")
    test=subprocess.run([sys.executable,"-m","unittest","-q","test_a6.py"],cwd=ROOT,text=True,capture_output=True)
    if test.returncode:
        print(test.stdout); print(test.stderr,file=sys.stderr); raise SystemExit(test.returncode)
    print("A6 Dashboard v1: OK (26 tests, read-only, fixture-marked, no public runtime)")
if __name__=="__main__": main()
