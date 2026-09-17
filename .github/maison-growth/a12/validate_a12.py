#!/usr/bin/env python3
import hashlib,json,sqlite3,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def ok(c,m):
 if not c: raise AssertionError(m)
def load(n): return json.loads((ROOT/n).read_text(encoding='utf-8'))

def contracts():
 c=load('a12-contract.json'); p=load('a12-permissions.json'); pol=load('autonomy-policy.json'); m=load('migration-manifest.json')
 ok(c['mode']=='simulation_only','A12 must be simulation only'); ok(c['public_write_authorized'] is False,'public write disabled'); ok(c['autonomous_public_write_authorized'] is False,'public autonomy disabled'); ok(c['automatic_execution_risk_max']=='low','only low risk may auto')
 ok(p['default']=='deny','deny by default'); ok(p['autonomous_public_write_authorized'] is False,'permission public autonomy disabled')
 for x in ['repository.write','public_site.autonomous_write','price.write','checkout.write','catalogue.write','hard_gates.write','permissions.write','public_authorization.write']: ok(x in p['deny'],f'missing deny {x}')
 ok(pol['global_kill_switch_default'] is True,'kill switch must default on'); ok(pol['public_autonomy_enabled'] is False,'public autonomy must be false')
 mig=ROOT/m['migrations'][0]['path']; ok(hashlib.sha256(mig.read_bytes()).hexdigest()==m['migrations'][0]['sha256'],'migration hash mismatch')

def sql_validation():
 sql=(ROOT/'migrations/0010_gradual_autonomy_dashboard_v2.sql').read_text(encoding='utf-8')
 for tok in ['public_write_authorized=0','public_side_effects=0',"autonomy_level<>'low_risk_auto' OR risk_class='low'","state_key<>'public_autonomy'"]: ok(tok in sql,f'missing guard {tok}')
 db=sqlite3.connect(':memory:'); db.executescript('''PRAGMA foreign_keys=ON;
 CREATE TABLE schema_state(schema_key TEXT PRIMARY KEY,schema_value TEXT NOT NULL);
 CREATE TABLE rule_versions(rule_version_id TEXT PRIMARY KEY); CREATE TABLE model_versions(model_version_id TEXT PRIMARY KEY);
 CREATE TABLE decision_records(decision_id TEXT PRIMARY KEY); CREATE TABLE experiment_results(experiment_result_id TEXT PRIMARY KEY);
 CREATE TABLE publish_runs(publish_run_id TEXT PRIMARY KEY); CREATE TABLE ocean_promotion_runs(promotion_run_id TEXT PRIMARY KEY);
 CREATE TABLE learning_records(learning_record_id TEXT PRIMARY KEY);'''); db.executescript(sql)
 expected={'autonomy_job_definitions','autonomy_job_runs','autonomy_lock_events','autonomy_state_events','autonomy_action_log','autonomy_human_queue','autonomy_health_checks','autonomy_alerts'}
 got={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}; ok(expected<=got,'missing A12 tables')
 rul='rul_'+'a'*36; db.execute('INSERT INTO rule_versions VALUES (?)',(rul,)); job='job_'+'b'*36
 db.execute('''INSERT INTO autonomy_job_definitions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',(job,'health-hourly','internal_health_check','low','low_risk_auto','hourly',2,80,10,rul,None,'2026-09-17T00:00:00Z'))
 try: db.execute('''INSERT INTO autonomy_job_definitions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''',('job_'+'c'*36,'bad','public_content_write','high','low_risk_auto','hourly',2,80,10,rul,None,'2026-09-17T00:00:00Z'))
 except sqlite3.IntegrityError: pass
 else: raise AssertionError('high risk low_risk_auto accepted')
 try: db.execute("UPDATE autonomy_job_definitions SET schedule_key='daily' WHERE autonomy_job_id=?",(job,))
 except sqlite3.DatabaseError: pass
 else: raise AssertionError('job update allowed')

def main():
 contracts(); sql_validation(); p=subprocess.run([sys.executable,str(ROOT/'test_a12.py')],cwd=str(ROOT),capture_output=True,text=True)
 if p.returncode: print(p.stdout); print(p.stderr,file=sys.stderr); raise SystemExit(p.returncode)
 print(p.stderr,end=''); print('A12 Gradual Autonomy + Dashboard v2: OK')
if __name__=='__main__': main()
