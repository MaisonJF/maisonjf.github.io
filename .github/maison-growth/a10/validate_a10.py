#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent; GROWTH=ROOT.parent

def load(name): return json.loads((ROOT/name).read_text(encoding='utf-8'))
def ok(cond,msg):
    if not cond: raise AssertionError(msg)

def validate_contracts():
    c=load('a10-contract.json'); p=load('a10-permissions.json'); policy=load('promotion-policy.json'); a9=json.loads((GROWTH/'a9'/'publisher-policy.json').read_text(encoding='utf-8'))
    ok(c['mode']=='dry_run_only','A10 must remain dry-run only')
    ok(c['repository_terminal_state']=='publication_ready','A10 must stop before public')
    ok(c['evidence_sources_min_default']>=2,'at least two evidence sources required')
    ok(c['score_after_hard_gates_only'] is True,'score must follow hard gates')
    ok(p['default']=='deny','permissions must deny by default')
    for name in ['repository.write','public_site.write','ocean.publish','sitemap.write','indexnow.submit','oracle.content.read','paid_content.read']:
        ok(name in p['deny'],f'missing deny: {name}')
    ok(p['public_write_authorized'] is False,'public write must be disabled')
    ok(policy['public_transition_in_a10'] is False,'A10 may not transition to public')
    ok(policy['min_independent_evidence_sources']>=2,'policy evidence minimum invalid')
    ok(sum(policy['promotion_score']['weights'].values())==100,'score weights must sum to 100')
    ok(a9['mode']=='dry_run_only','A9 must still be dry-run only')
    ap=a9['actions']['ocean_promotion']
    for req in ['decision_id','candidate_id','baseline_commit_sha','snapshot_hash']: ok(req in ap['requires'],f'A9 compatibility missing {req}')
    ok(ap['ocean_guard_required'] is True,'A9 Ocean promotion must require Guard')
    ok(ap['may_modify_existing_content'] is False,'A9 Ocean promotion may not rewrite existing content')

def validate_sql():
    sql=(ROOT/'migrations/0008_ocean_promotion.sql').read_text(encoding='utf-8')
    for token in ['runtime_publication_authorized=0','public_side_effects=0',"CHECK (to_state <> 'public')",'uses_paid_oracle_content=0','indexnow_authorized=0','sitemap_authorized=0']:
        ok(token in sql,f'missing structural guard: {token}')
    db=sqlite3.connect(':memory:'); db.executescript('''PRAGMA foreign_keys=ON; CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL); CREATE TABLE internal_candidates(internal_candidate_id TEXT PRIMARY KEY); CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY); CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY); CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY); CREATE TABLE solutions(solution_id TEXT PRIMARY KEY);'''); db.executescript(sql)
    expected={'ocean_promotion_runs','ocean_promotion_state_events','ocean_promotion_evidence','ocean_promotion_gate_results','ocean_promotion_scores','ocean_promotion_drafts','ocean_promotion_validations','ocean_publisher_links'}
    tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}; ok(expected<=tables,'missing A10 tables')
    version=db.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a10_schema_version'").fetchone(); ok(version and version[0]=='A10.1','schema version missing')
    ids={'can':'can_'+'a'*36,'dec':'dec_'+'b'*36,'rul':'rul_'+'c'*36,'opm':'opm_'+'d'*36}; db.execute('INSERT INTO internal_candidates VALUES (?)',(ids['can'],)); db.execute('INSERT INTO decision_records VALUES (?)',(ids['dec'],)); db.execute('INSERT INTO rule_versions VALUES (?)',(ids['rul'],)); db.execute('''INSERT INTO ocean_promotion_runs (promotion_run_id,internal_candidate_id,decision_id,rule_version_id,model_version_id,policy_version,baseline_commit_sha,input_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)''',(ids['opm'],ids['can'],ids['dec'],ids['rul'],None,'A10.1','e'*40,'f'*64,'2026-09-17T00:00:00Z'))
    try: db.execute("INSERT INTO ocean_promotion_state_events (promotion_state_event_id,promotion_run_id,from_state,to_state,reason_code,occurred_at,actor_kind) VALUES (?,?,?,?,?,?,?)",('ops_'+'1'*36,ids['opm'],'guard_passed','public','NO','2026-09-17T00:00:01Z','system_simulation'))
    except sqlite3.IntegrityError: pass
    else: raise AssertionError('database accepted public state')
    try: db.execute("UPDATE ocean_promotion_runs SET policy_version='x' WHERE promotion_run_id=?",(ids['opm'],))
    except sqlite3.DatabaseError: pass
    else: raise AssertionError('immutable run was updateable')

def main():
    validate_contracts(); validate_sql()
    proc=subprocess.run([sys.executable,'-m','unittest','discover','-s',str(ROOT),'-p','test_a10*.py'],cwd=str(ROOT),capture_output=True,text=True)
    if proc.returncode: print(proc.stdout); print(proc.stderr,file=sys.stderr); raise SystemExit(proc.returncode)
    print(proc.stderr,end=''); print('A10 contract: OK')

if __name__=='__main__': main()
