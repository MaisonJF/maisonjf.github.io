import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOceanInput, oceanGate, shouldAlert } from '../src/ocean_memory.js';

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
