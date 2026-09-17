import importlib.util, sys, unittest
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('a10_pipeline',ROOT/'pipeline.py')
m=importlib.util.module_from_spec(spec); sys.modules[spec.name]=m; spec.loader.exec_module(m)
CID='can_'+'a'*36; DID='dec_'+'b'*36; RID='rul_'+'c'*36; MID='mdl_'+'d'*36; BASE='e'*40; SNAP='f'*64

def evidence(n=2):
    return [
      {'evidence_id':'ev_gsc','independent_group':'gsc','confidence_score':90},
      {'evidence_id':'ev_site','independent_group':'site','confidence_score':85},
      {'evidence_id':'ev_commerce','independent_group':'commerce','confidence_score':80}][:n]

def candidate(**overrides):
    c={'internal_candidate_id':CID,'state':'internal_candidate','semantic_distinction':True,'standalone_utility':True,'coverage':'none','cannibalization_risk':'low','commercial_adjacency':True,'uses_paid_oracle_content':False,'would_substitute_paid_oracle':False,'safety_quality':True,'architecture_compatible':True,'score_signals':{'semantic_distinction':100,'demand_evidence':100,'coverage_gap':100,'standalone_utility':100,'commercial_adjacency':100,'evidence_confidence':90,'strategic_value':90,'interlinking_value':90}}
    c.update(overrides); return c

def assess(c=None,ev=None):
    return m.assess_candidate(c or candidate(),decision_id=DID,evidence=evidence() if ev is None else ev,rule_version_id=RID,model_version_id=MID,baseline_commit_sha=BASE)

def draft():
    return {'title':'Quando a casa pesa mais do que devia','description':'Uma leitura prática para reconhecer quando o espaço deixa de apoiar o dia a dia.','intent_summary':'Pessoa procura compreender desconforto persistente associado à casa.','body_markdown':'Este texto ajuda a reconhecer sinais concretos, distinguir desconforto pontual de padrão e identificar próximos passos sem substituir qualquer consulta ou leitura paga.','proposed_content_root':'casa/','proposed_slug':'quando-a-casa-pesa','source_material_classes':['map_aggregate','gsc_aggregate'],'approved_solution_id':None}

class FakeGateway:
    class GuardFailed(Exception): pass
    @dataclass(frozen=True)
    class DiffFile:
        path:str; change_type:str; before_content:str|None; after_content:str|None; before_hash:str|None; after_hash:str|None; mutation_capabilities:tuple=()
    @staticmethod
    def sha256_text(v):
        import hashlib; return hashlib.sha256(v.encode()).hexdigest()
    @staticmethod
    def build_dry_run(request,files,*,guard_result,active_runs=()):
        if guard_result.get('name')!='Oceans Guard' or guard_result.get('conclusion')!='success': raise FakeGateway.GuardFailed('guard failed')
        import hashlib, json
        fp=hashlib.sha256(json.dumps([(x.path,x.change_type,x.before_hash,x.after_hash) for x in files],sort_keys=True).encode()).hexdigest()
        return {'publish_run_id':'pub_'+hashlib.sha256((request['decision_id']+fp).encode()).hexdigest()[:36],'mode':'dry_run','diff_fingerprint':fp,'rollback_plan':[{'path':x.path,'restore_hash':x.before_hash,'from_hash':x.after_hash} for x in files],'ready_for_public_write':False,'public_side_effects':False}

VALID={k:True for k in ['semantic_distinction','standalone_utility','coverage_gap','cannibalization_safe','commercial_adjacency','paid_oracle_safe','content_contract','link_validation','snapshot_match']}

class A10Tests(unittest.TestCase):
    def test_eligible(self):
        a=assess(); self.assertEqual(a.state,'promotion_eligible'); self.assertGreaterEqual(a.score,85); self.assertTrue(all(g.passed for g in a.gates))
    def test_score_never_overrides_gate(self):
        a=assess(candidate(safety_quality=False)); self.assertEqual(a.state,'rejected'); self.assertIsNone(a.score)
    def test_two_sources_required(self):
        a=assess(ev=evidence(1)); self.assertEqual(a.state,'promotion_candidate'); self.assertIsNone(a.score)
    def test_duplicate_alias(self):
        self.assertEqual(assess(candidate(duplicate_of_intent_id='int_'+'1'*36)).state,'alias')
    def test_sufficient_coverage_reinforce(self):
        self.assertEqual(assess(candidate(coverage='sufficient')).state,'reinforced')
    def test_redundant_coverage_reinforce(self):
        self.assertEqual(assess(candidate(coverage='redundant')).state,'reinforced')
    def test_paid_oracle_rejected(self):
        a=assess(candidate(uses_paid_oracle_content=True)); self.assertEqual(a.state,'rejected'); self.assertIn('PAID_ORACLE_SUBSTITUTION_RISK',a.reason_codes)
    def test_oracle_substitution_rejected(self):
        self.assertEqual(assess(candidate(would_substitute_paid_oracle=True)).state,'rejected')
    def test_archive(self):
        self.assertEqual(assess(candidate(archive_requested=True,standalone_utility=False)).state,'archived')
    def test_high_cannibalization(self):
        a=assess(candidate(cannibalization_risk='high')); self.assertEqual(a.state,'rejected'); self.assertIsNone(a.score)
    def test_low_score_stays_candidate(self):
        c=candidate(score_signals={k:0 for k in candidate()['score_signals']}); a=assess(c); self.assertEqual(a.state,'promotion_candidate'); self.assertIsNotNone(a.score)
    def test_draft_is_intelligence_only(self):
        d=m.create_intelligence_draft(assess(),draft()); self.assertEqual(d['state'],'draft_isolated'); self.assertFalse(any(d[k] for k in ['public_url_assigned','sitemap_authorized','indexnow_authorized','navigation_authorized','indexing_authorized','public_side_effects']))
    def test_public_url_forbidden_in_draft(self):
        d=draft(); d['public_url']='https://maison-jf.com/x'
        with self.assertRaises(m.DraftError): m.create_intelligence_draft(assess(),d)
    def test_paid_oracle_source_forbidden(self):
        d=draft(); d['source_material_classes']=['oracle_paid']
        with self.assertRaises(m.DraftError): m.create_intelligence_draft(assess(),d)
    def test_noneligible_cannot_draft(self):
        with self.assertRaises(m.StateError): m.create_intelligence_draft(assess(ev=evidence(1)),draft())
    def test_validation_requires_every_check(self):
        d=m.create_intelligence_draft(assess(),draft())
        with self.assertRaises(m.DraftError): m.validate_draft(assess(),d,{'semantic_distinction':True})
    def test_publisher_dry_run_stops_before_public(self):
        a=assess(); d=m.create_intelligence_draft(a,draft()); v=m.validate_draft(a,d,VALID)
        with patch.object(m,'_load_a9_gateway',return_value=FakeGateway):
            r=m.build_a9_dry_run(a,d,v,sitemap_ocean_path='sitemap-oceans-fixture.xml',sitemap_ocean_before=None,sitemap_ocean_after='<urlset/>',sitemap_index_before='<sitemapindex/>',sitemap_index_after='<sitemapindex><sitemap/></sitemapindex>',snapshot_hash=SNAP,guard_result={'name':'Oceans Guard','conclusion':'success'})
        self.assertEqual(r['pipeline_state'],'publication_ready'); self.assertFalse(r['a10_public_write_authorized']); self.assertFalse(r['public_side_effects'])
    def test_guard_failure_blocks(self):
        a=assess(); d=m.create_intelligence_draft(a,draft()); v=m.validate_draft(a,d,VALID)
        with patch.object(m,'_load_a9_gateway',return_value=FakeGateway):
            with self.assertRaises(FakeGateway.GuardFailed): m.build_a9_dry_run(a,d,v,sitemap_ocean_path='sitemap-oceans-fixture.xml',sitemap_ocean_before=None,sitemap_ocean_after='<urlset/>',sitemap_index_before='<sitemapindex/>',sitemap_index_after='<sitemapindex/>',snapshot_hash=SNAP,guard_result={'name':'Oceans Guard','conclusion':'failure'})
    def test_existing_ocean_sitemap_update_rejected(self):
        a=assess(); d=m.create_intelligence_draft(a,draft()); v=m.validate_draft(a,d,VALID)
        with patch.object(m,'_load_a9_gateway',return_value=FakeGateway):
            with self.assertRaises(m.PublisherCompatibilityError): m.build_a9_dry_run(a,d,v,sitemap_ocean_path='sitemap-oceans-fixture.xml',sitemap_ocean_before='<old/>',sitemap_ocean_after='<new/>',sitemap_index_before='<sitemapindex/>',sitemap_index_after='<sitemapindex/>',snapshot_hash=SNAP,guard_result={'name':'Oceans Guard','conclusion':'success'})
    def test_run_id_deterministic(self):
        self.assertEqual(assess().promotion_run_id,assess().promotion_run_id)

if __name__=='__main__': unittest.main()
