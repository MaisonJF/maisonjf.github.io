#!/usr/bin/env python3
import unittest
from gateway import *

DEC='dec_'+'a'*36
CAN='can_'+'b'*36
EXP='exp_'+'c'*36
BASE='d'*40
SNAP='e'*64

def df(path, change, before, after, caps=()):
    return DiffFile(path,change,before,after,sha256_text(before) if before is not None else None,sha256_text(after) if after is not None else None,tuple(caps))

def ocean_req(): return {'action':'ocean_promotion','decision_id':DEC,'candidate_id':CAN,'baseline_commit_sha':BASE,'snapshot_hash':SNAP,'prepublication_results':{'snapshot_match':{'passed':True},'content_contract':{'passed':True},'link_validation':{'passed':True}}}
def cta_req(): return {'action':'cta_experiment','decision_id':DEC,'experiment_id':EXP,'baseline_commit_sha':BASE,'snapshot_hash':SNAP,'target_asset_path':'servicos.html','prepublication_results':{'snapshot_match':{'passed':True},'experiment_snapshot_match':{'passed':True},'link_validation':{'passed':True}}}
def guard(ok=True): return {'name':'Oceans Guard','conclusion':'success' if ok else 'failure'}

class A9Tests(unittest.TestCase):
    def test_allowed_ocean_publication_dry_run(self):
        plan=build_dry_run(ocean_req(),[df('cabeca/nao-consigo-parar-de-pensar.html','create',None,'<html>x</html>'),df('sitemap-oceans-2026-09-17-01.xml','create',None,'<xml/>'),df('sitemap.xml','update','old','new')],guard_result=guard())
        self.assertFalse(plan['ready_for_public_write']); self.assertTrue(plan['branch_name'].startswith('growth/publish/pub_'))
    def test_forbidden_workflow_file(self):
        with self.assertRaises(ForbiddenPath): build_dry_run(ocean_req(),[df('.github/workflows/ocean-guard.yml','create',None,'x')],guard_result=guard())
    def test_forbidden_redirect(self):
        with self.assertRaises(ForbiddenPath): build_dry_run(ocean_req(),[df('_redirects','update','a','b')],guard_result=guard())
    def test_functions_api_protected(self):
        with self.assertRaises(ForbiddenPath): build_dry_run(ocean_req(),[df('functions/api/pay.js','create',None,'x')],guard_result=guard())
    def test_diff_tampered_after_hash(self):
        f=DiffFile('cabeca/a.html','create',None,'x',None,'0'*64,())
        with self.assertRaises(DiffTampered): build_dry_run(ocean_req(),[f],guard_result=guard())
    def test_bypass_allowlist_extra_file(self):
        with self.assertRaises(AllowlistViolation): build_dry_run(ocean_req(),[df('cabeca/a.html','create',None,'x'),df('index.html','update','a','b')],guard_result=guard())
    def test_existing_ocean_content_cannot_update(self):
        with self.assertRaises(AllowlistViolation): build_dry_run(ocean_req(),[df('cabeca/a.html','update','a','b')],guard_result=guard())
    def test_missing_prepublication_validation_blocks(self):
        r=ocean_req(); del r['prepublication_results']['content_contract']
        with self.assertRaises(ValidationError): build_dry_run(r,[df('cabeca/a.html','create',None,'x')],guard_result=guard())
    def test_guard_failure_blocks(self):
        with self.assertRaises(GuardFailed): build_dry_run(ocean_req(),[df('cabeca/a.html','create',None,'x')],guard_result=guard(False))
    def test_cta_exact_asset_allowed(self):
        plan=build_dry_run(cta_req(),[df('servicos.html','update','old','new',('approved_cta_destination_reference',))],guard_result=guard())
        self.assertEqual(plan['experiment_id'],EXP)
    def test_cta_other_asset_blocked(self):
        with self.assertRaises(AllowlistViolation): build_dry_run(cta_req(),[df('index.html','update','old','new',('approved_cta_destination_reference',))],guard_result=guard())
    def test_cta_price_capability_blocked(self):
        with self.assertRaises(AllowlistViolation): build_dry_run(cta_req(),[df('servicos.html','update','old','new',('price_change',))],guard_result=guard())
    def test_path_traversal_blocked(self):
        with self.assertRaises(ValidationError): build_dry_run(ocean_req(),[df('../index.html','create',None,'x')],guard_result=guard())
    def test_repeated_execution_idempotent(self):
        files=[df('cabeca/a.html','create',None,'x')]
        a=build_dry_run(ocean_req(),files,guard_result=guard()); b=build_dry_run(ocean_req(),files,guard_result=guard())
        self.assertEqual(a['publish_run_id'],b['publish_run_id']); self.assertEqual(a['diff_fingerprint'],b['diff_fingerprint'])
    def test_publish_run_conflict(self):
        files=[df('cabeca/a.html','create',None,'x')]
        first=build_dry_run(ocean_req(),files,guard_result=guard())
        with self.assertRaises(PublishConflict): build_dry_run(ocean_req(),files,guard_result=guard(),active_runs=[{'status':'validated','claimed_paths':first['claimed_paths']}])
    def test_released_run_no_conflict(self):
        files=[df('cabeca/a.html','create',None,'x')]
        plan=build_dry_run(ocean_req(),files,guard_result=guard(),active_runs=[{'status':'completed','claimed_paths':['cabeca/a.html']}])
        self.assertTrue(plan['publish_run_id'].startswith('pub_'))
    def test_ocean_requires_candidate(self):
        r=ocean_req(); del r['candidate_id']
        with self.assertRaises(ValidationError): build_dry_run(r,[df('cabeca/a.html','create',None,'x')],guard_result=guard())
    def test_cta_requires_experiment(self):
        r=cta_req(); del r['experiment_id']
        with self.assertRaises(ValidationError): build_dry_run(r,[df('servicos.html','update','a','b',('approved_cta_destination_reference',))],guard_result=guard())
    def test_decision_required(self):
        r=ocean_req(); del r['decision_id']
        with self.assertRaises(ValidationError): build_dry_run(r,[df('cabeca/a.html','create',None,'x')],guard_result=guard())
    def test_rollback_exact(self):
        before='old'; after='new'
        original=[{'path':'servicos.html','before_hash':sha256_text(before),'after_hash':sha256_text(after)}]
        r={'action':'rollback','decision_id':DEC,'baseline_commit_sha':BASE,'snapshot_hash':SNAP,'rollback_of_publish_run_id':'pub_'+'f'*36,'rollback_original_files':original,'prepublication_results':{'rollback_exactness':{'passed':True}}}
        item=DiffFile('servicos.html','update',after,before,sha256_text(after),sha256_text(before),())
        plan=build_dry_run(r,[item],guard_result=guard()); self.assertFalse(plan['ready_for_public_write'])
    def test_rollback_wrong_hash(self):
        original=[{'path':'servicos.html','before_hash':sha256_text('old'),'after_hash':sha256_text('new')}]
        r={'action':'rollback','decision_id':DEC,'baseline_commit_sha':BASE,'snapshot_hash':SNAP,'rollback_of_publish_run_id':'pub_'+'f'*36,'rollback_original_files':original,'prepublication_results':{'rollback_exactness':{'passed':True}}}
        with self.assertRaises(DiffTampered): build_dry_run(r,[df('servicos.html','update','new','not-old')],guard_result=guard())
    def test_rollback_exact_file_set(self):
        original=[{'path':'a.html','before_hash':sha256_text('a'),'after_hash':sha256_text('b')},{'path':'b.html','before_hash':sha256_text('c'),'after_hash':sha256_text('d')}]
        r={'action':'rollback','decision_id':DEC,'baseline_commit_sha':BASE,'snapshot_hash':SNAP,'rollback_of_publish_run_id':'pub_'+'f'*36,'rollback_original_files':original,'prepublication_results':{'rollback_exactness':{'passed':True}}}
        with self.assertRaises(AllowlistViolation): build_dry_run(r,[DiffFile('a.html','update','b','a',sha256_text('b'),sha256_text('a'),())],guard_result=guard())
    def test_empty_diff_rejected(self):
        with self.assertRaises(ValidationError): build_dry_run(ocean_req(),[],guard_result=guard())
    def test_duplicate_path_rejected(self):
        f=df('cabeca/a.html','create',None,'x')
        with self.assertRaises(ValidationError): build_dry_run(ocean_req(),[f,f],guard_result=guard())
    def test_invalid_commit_rejected(self):
        r=ocean_req(); r['baseline_commit_sha']='bad'
        with self.assertRaises(ValidationError): build_dry_run(r,[df('cabeca/a.html','create',None,'x')],guard_result=guard())
    def test_protected_capability_rejected(self):
        f=df('cabeca/a.html','create',None,'x',('legal_policy_change',))
        with self.assertRaises(AllowlistViolation): build_dry_run(ocean_req(),[f],guard_result=guard())

if __name__=='__main__': unittest.main(verbosity=2)
