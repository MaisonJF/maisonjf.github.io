#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MG = ROOT.parent


def assert_contracts() -> None:
    contract=json.loads((ROOT/'a7-contract.json').read_text(encoding='utf-8'))
    perms=json.loads((ROOT/'a7-permissions.json').read_text(encoding='utf-8'))
    policy=json.loads((ROOT/'decision-policy.json').read_text(encoding='utf-8'))
    provider=json.loads((ROOT/'model-provider-contract.json').read_text(encoding='utf-8'))
    dash=json.loads((ROOT/'dashboard-read-contract.json').read_text(encoding='utf-8'))
    assert contract['mode']=='analysis_only' and contract['principles']['public_side_effects'] is False
    assert contract['principles']['hard_gates_before_scoring'] is True and contract['principles']['score_never_overrides_gate'] is True
    assert perms['default']=='deny'
    forbidden={'repository.write','public_site.write','ocean.publish','cta.write','catalogue.write','checkout.write','price.write','product.create','service.create','commercial_pii.read','oracle.content.read'}
    assert forbidden <= set(perms['deny'])
    assert not (forbidden & set(perms['allow']))
    assert policy['default']=='deny' and sum(policy['discovery_weights'].values())==100 and sum(policy['commercial_weights'].values())==100
    assert provider['may_override_hard_gates'] is False and provider['may_execute_public_changes'] is False
    assert dash['mode']=='read_only' and dash['write_back'] is False and dash['approval_controls'] is False


def make_dependency_stubs(conn: sqlite3.Connection) -> None:
    conn.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY);
    CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
    CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
    CREATE TABLE solutions(solution_id TEXT PRIMARY KEY);
    CREATE TABLE needs(need_id TEXT PRIMARY KEY);
    CREATE TABLE intents(intent_id TEXT PRIMARY KEY);
    """)


def validate_migration() -> None:
    conn=sqlite3.connect(':memory:')
    make_dependency_stubs(conn)
    sql=(ROOT/'migrations/0005_decisor_commercial_discovery.sql').read_text(encoding='utf-8')
    conn.executescript(sql)
    tables={r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    required={'decision_runs','decision_gate_results','decision_records','decision_alternatives','commercial_gap_assessments','commercial_candidates'}
    assert required <= tables
    row=conn.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a7_schema_version'").fetchone()
    assert row and row[0]=='A7.1'
    text=sql.lower()
    assert "check (decision_type <> 'propose_promotion' or hard_gates_passed = 1)" in text
    assert "launch_authorized = 0" in text and "price_authorized = 0" in text and "public_side_effects = 0" in text
    assert "immutable" in text


def validate_no_public_paths() -> None:
    allowed_root=ROOT.resolve()
    for path in ROOT.rglob('*'):
        if path.is_file():
            assert path.resolve().is_relative_to(allowed_root)
    source=(ROOT/'decision_engine.py').read_text(encoding='utf-8').lower() + (ROOT/'commercial_discovery.py').read_text(encoding='utf-8').lower() + (ROOT/'repository.py').read_text(encoding='utf-8').lower()
    for token in ('github','indexnow','sitemap','functions/api','_redirects','checkout-session-live'):
        assert token not in source


def run_tests() -> None:
    proc=subprocess.run([sys.executable,str(ROOT/'test_a7.py')],cwd=ROOT,text=True,capture_output=True)
    if proc.returncode:
        print(proc.stdout); print(proc.stderr,file=sys.stderr); raise SystemExit(proc.returncode)
    count=proc.stderr.count('test_')
    print(proc.stderr.strip())


if __name__=='__main__':
    assert_contracts(); validate_migration(); validate_no_public_paths(); run_tests(); print('A7 contracts: OK')
