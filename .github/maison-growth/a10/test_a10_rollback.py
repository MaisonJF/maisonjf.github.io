import importlib.util, sys, unittest
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('a10_pipeline_rollback',ROOT/'pipeline.py')
m=importlib.util.module_from_spec(spec); sys.modules[spec.name]=m; spec.loader.exec_module(m)
DID='dec_'+'b'*36; BASE='e'*40; SNAP='f'*64; PUB='pub_'+'1'*36

class ExactRollbackGateway:
    class AllowlistViolation(Exception): pass
    class DiffTampered(Exception): pass
    @dataclass(frozen=True)
    class DiffFile:
        path:str; change_type:str; before_content:str|None; after_content:str|None; before_hash:str|None; after_hash:str|None; mutation_capabilities:tuple=()
    @staticmethod
    def build_dry_run(request,files,*,guard_result,active_runs=()):
        if request.get('action')!='rollback': raise AssertionError('rollback expected')
        original={x['path']:x for x in request['rollback_original_files']}; seen={x.path for x in files}
        if seen!=set(original): raise ExactRollbackGateway.AllowlistViolation('exact original file set required')
        for item in files:
            if item.after_hash!=original[item.path].get('before_hash'): raise ExactRollbackGateway.DiffTampered('previous hash not restored')
        if guard_result.get('conclusion')!='success': raise AssertionError('Guard must pass')
        return {'publish_run_id':'pub_'+'2'*36,'mode':'dry_run','ready_for_public_write':False,'public_side_effects':False}

def original():
    return [
      {'path':'casa/x.html','before_hash':None},
      {'path':'sitemap-oceans-x.xml','before_hash':None},
      {'path':'sitemap.xml','before_hash':'a'*64}]

def restored():
    return [
      {'path':'casa/x.html','change_type':'delete','before_content':'new','after_content':None,'before_hash':'b'*64,'after_hash':None},
      {'path':'sitemap-oceans-x.xml','change_type':'delete','before_content':'xml','after_content':None,'before_hash':'c'*64,'after_hash':None},
      {'path':'sitemap.xml','change_type':'update','before_content':'newindex','after_content':'oldindex','before_hash':'d'*64,'after_hash':'a'*64}]

class RollbackTests(unittest.TestCase):
    def test_exact_rollback_is_dry_run_only(self):
        with patch.object(m,'_load_a9_gateway',return_value=ExactRollbackGateway):
            r=m.build_exact_rollback_dry_run({'publish_run_id':PUB},decision_id=DID,baseline_commit_sha=BASE,snapshot_hash=SNAP,original_files=original(),restored_files=restored(),guard_result={'name':'Oceans Guard','conclusion':'success'})
        self.assertEqual(r['mode'],'dry_run'); self.assertFalse(r['ready_for_public_write']); self.assertFalse(r['public_side_effects'])
    def test_rollback_missing_original_file_rejected(self):
        bad=restored()[:-1]
        with patch.object(m,'_load_a9_gateway',return_value=ExactRollbackGateway):
            with self.assertRaises(ExactRollbackGateway.AllowlistViolation):
                m.build_exact_rollback_dry_run({'publish_run_id':PUB},decision_id=DID,baseline_commit_sha=BASE,snapshot_hash=SNAP,original_files=original(),restored_files=bad,guard_result={'name':'Oceans Guard','conclusion':'success'})
    def test_rollback_wrong_previous_hash_rejected(self):
        bad=restored(); bad[-1]=dict(bad[-1],after_hash='9'*64)
        with patch.object(m,'_load_a9_gateway',return_value=ExactRollbackGateway):
            with self.assertRaises(ExactRollbackGateway.DiffTampered):
                m.build_exact_rollback_dry_run({'publish_run_id':PUB},decision_id=DID,baseline_commit_sha=BASE,snapshot_hash=SNAP,original_files=original(),restored_files=bad,guard_result={'name':'Oceans Guard','conclusion':'success'})

if __name__=='__main__': unittest.main()
