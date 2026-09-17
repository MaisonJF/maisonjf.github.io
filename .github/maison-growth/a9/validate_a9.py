#!/usr/bin/env python3
from __future__ import annotations
import json, sqlite3, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
MG=ROOT.parent

def assert_contracts():
    c=json.loads((ROOT/'a9-contract.json').read_text()); p=json.loads((ROOT/'publisher-policy.json').read_text()); perms=json.loads((ROOT/'a9-permissions.json').read_text()); ident=json.loads((ROOT/'identity-contract.json').read_text())
    assert c['mode']=='dry_run_only' and c['role']=='sole_future_public_writer' and c['decides_what_to_publish'] is False and c['production_credentials_present'] is False
    assert p['default']=='deny' and p['mode']=='dry_run_only'
    assert perms['default']=='deny' and perms['mode']=='dry_run_only'
    assert ident['credential_state']=='not_provisioned' and ident['production_write_enabled'] is False and ident['repository_secret_storage_allowed'] is False
    protected=set(p['protected_paths']); assert {'.github/workflows/**','_redirects','functions/api/**','functions/_lib/**'} <= protected
    for a in ('ocean_promotion','cta_experiment','rollback'): assert p['actions'][a]['ocean_guard_required'] is True

def assert_prior_modules_cannot_write_public():
    root=json.loads((MG/'permissions.json').read_text())
    for name,comp in root['components'].items():
        if name=='publisher_gateway': continue
        assert comp.get('repo_write') is not True, f'{name} unexpectedly has repo write'
    for stage in range(1,9):
        folder=MG/f'a{stage}'
        for path in folder.glob('*permissions.json'):
            data=json.loads(path.read_text())
            allow=set(data.get('allow',[]))
            dangerous={'repository.write','public_site.write','ocean.publish','cta.write','catalogue.write','checkout.write','price.write','discount.write','product.launch'}
            assert not (allow & dangerous), f'{path} grants public write capability'

def migration_test():
    conn=sqlite3.connect(':memory:')
    conn.executescript('''PRAGMA foreign_keys=ON; CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT); CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY); CREATE TABLE experiments(experiment_id TEXT PRIMARY KEY);''')
    sql=(ROOT/'migrations/0007_publisher_gateway.sql').read_text()
    conn.executescript(sql)
    tables={r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {'publisher_identities','publish_runs','publish_run_files','publish_validations','publish_run_events','publish_run_results','publish_rollback_plans','publish_path_claims'} <= tables
    assert conn.execute("SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a9_schema_version'").fetchone()[0]=='A9.1'
    text=sql.lower(); assert "mode='dry_run'" in text and 'public_write_authorized=0' in text and 'executable_in_a9=0' in text and 'immutable' in text

def source_boundary_test():
    combined='\n'.join((ROOT/p).read_text().lower() for p in ('gateway.py','repository.py'))
    for token in ('github_token','private_key','api.github.com/repos','merge_pull_request','update_ref('): assert token not in combined

def run_tests():
    r=subprocess.run([sys.executable,str(ROOT/'test_a9.py')],cwd=ROOT,text=True,capture_output=True)
    if r.returncode:
        print(r.stdout); print(r.stderr,file=sys.stderr); raise SystemExit(r.returncode)
    print(r.stderr.strip())

if __name__=='__main__':
    assert_contracts(); assert_prior_modules_cannot_write_public(); migration_test(); source_boundary_test(); run_tests(); print('A9 contracts: OK')
