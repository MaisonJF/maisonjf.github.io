import test from 'node:test';
import assert from 'node:assert/strict';
import { handleOceanMemoryRequest, normalizeOceanInput, oceanGate, shouldAlert } from '../src/ocean_memory.js';

test('Ocean intake stores one-source hypotheses instead of blocking them',()=>{
  const item=normalizeOceanInput({
    kind:'hypothesis',
    ocean_key:'tempo-meu-a-noite',
    source_ref:'https://example.com/thread',
    summary:'A noite surge como recuperação de autonomia.',
    evidence_roots:['https://example.com/thread'],
    theme_candidates:['nada novo depois de certa hora'],
    commercial_adjacency:[{kind:'ritual'}],
    relevance_score:64,
    commercial_score:55
  });
  assert.equal(item.oceanKey,'tempo-meu-a-noite');
  assert.equal(item.evidenceRoots.length,1);
  const gate=oceanGate({canonicalOceanId:null,independentEvidenceCount:1,relevanceScore:64});
  assert.equal(gate.lifecycleState,'provisional');
  assert.equal(gate.promotionGateState,'observe');
});

test('two independent roots move filtering downstream into review, not ingest',()=>{
  const gate=oceanGate({canonicalOceanId:null,independentEvidenceCount:2,relevanceScore:72});
  assert.equal(gate.lifecycleState,'review_ready');
  assert.equal(gate.promotionGateState,'review');
  assert.equal(shouldAlert({kind:'hypothesis',independentEvidenceCount:2,relevanceScore:72,commercialScore:10}),true);
});

test('existing Ocean enrichment can alert without GitHub persistence',()=>{
  const gate=oceanGate({canonicalOceanId:'adiar-o-sono-para-recuperar-autonomia',independentEvidenceCount:2,relevanceScore:68});
  assert.equal(gate.lifecycleState,'reinforced');
  assert.equal(shouldAlert({kind:'enrichment',independentEvidenceCount:2,relevanceScore:68,commercialScore:62}),true);
});

test('sensitive fields are rejected at the narrow entry boundary',()=>{
  assert.throws(()=>normalizeOceanInput({
    kind:'signal',
    ocean_key:'x-signal',
    source_ref:'x',
    summary:'safe',
    email:'person@example.com'
  }),/forbidden_payload_key/);
});

test('relevant Ocean ingest delivers Brain alert inline with zero D1 reads',async()=>{
  class Statement {
    constructor(db,sql){ this.db=db; this.sql=sql; this.params=[]; }
    bind(...params){ this.params=params; return this; }
    async run(){
      this.db.writes.push({sql:this.sql,params:this.params});
      return {success:true,meta:{changes:1}};
    }
    async first(){ this.db.reads++; throw new Error('unexpected_d1_read'); }
    async all(){ this.db.reads++; throw new Error('unexpected_d1_read'); }
  }
  class DB {
    constructor(){ this.reads=0; this.writes=[]; }
    prepare(sql){ return new Statement(this,sql); }
  }
  const db=new DB();
  const request=new Request('https://worker.example/internal/oceans/ingest',{
    method:'POST',
    headers:{Authorization:'Bearer secret','Content-Type':'application/json'},
    body:JSON.stringify({
      kind:'enrichment',
      ocean_key:'adiar-o-sono-para-recuperar-autonomia',
      canonical_ocean_id:'adiar-o-sono-para-recuperar-autonomia',
      source_ref:'ocean:test',
      summary:'A noite surge como recuperação de tempo próprio.',
      evidence_roots:['https://example.org/a','https://example.org/b'],
      relevance_score:72,
      commercial_score:75
    })
  });
  const response=await handleOceanMemoryRequest(request,{
    OCEAN_MEMORY_ENABLED:'true',
    BRAIN_CONTROL_TOKEN:'secret',
    GROWTH_DB:db
  });
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(db.reads,0);
  assert.equal(body.d1_reads_per_ingest,0);
  assert.equal(body.delivery_mode,'inline_no_poll');
  assert.equal(body.brain_alert.provider_id,'ocean_memory');
  assert.equal(body.brain_alert.territory_key,'adiar-o-sono-para-recuperar-autonomia');
  assert.equal(body.brain_alert.ocean_alert_kind,'commercial_opportunity');
  assert.equal(db.writes.length,2);
  assert.equal(body.d1_writes_per_unique_ingest,2);
});

