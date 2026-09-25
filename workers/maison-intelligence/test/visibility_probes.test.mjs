import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VISIBILITY_PROBES,
  buildVisibilityProbePrompt,
  decorateVisibilityResult,
  probesForDate,
  providerCanRunProbe
} from '../src/visibility_probes.js';

test('visibility probes always include a brand representation control',()=>{
  for(const date of [
    new Date('2026-09-25T00:00:00Z'),
    new Date('2026-09-26T00:00:00Z'),
    new Date('2026-09-27T00:00:00Z')
  ]){
    assert.ok(probesForDate(date,2).some(x=>x.id==='brand_identity'));
  }
});

test('generic discovery probes require grounded providers',()=>{
  const generic=VISIBILITY_PROBES.find(x=>x.id==='tarot_portugal');
  const brand=VISIBILITY_PROBES.find(x=>x.id==='brand_identity');
  assert.equal(providerCanRunProbe('openrouter',generic),false);
  assert.equal(providerCanRunProbe('osiris_gateway',generic),false);
  assert.equal(providerCanRunProbe('openai',generic),true);
  assert.equal(providerCanRunProbe('google_gemini',generic),true);
  assert.equal(providerCanRunProbe('perplexity',generic),true);
  assert.equal(providerCanRunProbe('openrouter',brand),true);
});

test('probe prompt treats absence as valid and forbids forced Maison inclusion',()=>{
  const probe=VISIBILITY_PROBES[0];
  const prompt=buildVisibilityProbePrompt(probe);
  assert.match(prompt,/Do not force MAISON JF/i);
  assert.match(prompt,/absence is valid evidence/i);
  assert.match(prompt,/MAISON_VISIBILITY:/);
});

test('probe decoration records mention and canonical citation separately',()=>{
  const probe=VISIBILITY_PROBES[0];
  const decorated=decorateVisibilityResult({
    providerId:'openai',
    modelId:'test',
    sourceClass:'ai_web_grounded',
    text:'A MAISON JF é uma marca portuguesa.',
    citations:['https://maison-jf.com/farol','https://example.com/a'],
    usage:{}
  },probe);
  const payload=JSON.parse(decorated.text);
  assert.equal(payload.maison_mentioned,true);
  assert.equal(payload.maison_cited,true);
  assert.equal(decorated.evidenceKind,'coverage');
  assert.equal(decorated.sourceKind,'ai_visibility_probe');
  assert.equal(decorated.strength,70);
});

test('uncited model mention remains low-strength representation evidence',()=>{
  const decorated=decorateVisibilityResult({
    providerId:'openrouter',
    modelId:'free',
    sourceClass:'ai_api',
    text:'MAISON JF',
    citations:[]
  },VISIBILITY_PROBES[0]);
  const payload=JSON.parse(decorated.text);
  assert.equal(payload.maison_mentioned,true);
  assert.equal(payload.maison_cited,false);
  assert.equal(decorated.strength,35);
});
