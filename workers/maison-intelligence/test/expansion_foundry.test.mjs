import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpansionPrompt, parseJsonObject, modelLens } from '../src/expansion_foundry.js';

const context={
  strongest_ocean:'transicao-trabalho-casa',
  existing_assets:['Névoa','Vela pequena','PÁRA DE IGNORAR!'],
  signals:[{
    ocean_key:'transicao-trabalho-casa',
    summary:'Pessoas descrevem dificuldade em desligar do trabalho quando chegam a casa.',
    themes:['desligar','casa'],
    evidence_roots:['https://example.org/a'],
    relevance_score:82,
    commercial_score:70
  }]
};

test('Foundry prompt is candidate-only and existing-assets first',()=>{
  const prompt=buildExpansionPrompt({spec:{key:'openrouter:test:free',providerId:'openrouter',modelId:'test:free'},context});
  assert.match(prompt,/PRIVATE EXPANSION FOUNDRY/i);
  assert.match(prompt,/Never approve, publish, price, launch/i);
  assert.match(prompt,/existing Maison assets/i);
  assert.match(prompt,/reel/i);
  assert.match(prompt,/physical_product/i);
  assert.match(prompt,/human review/i);
});

test('Foundry parser accepts strict candidate envelope',()=>{
  const out=parseJsonObject('{"candidates":[{"candidate_type":"reel","title":"x"}]}');
  assert.equal(out.candidates[0].candidate_type,'reel');
});

test('model lenses are deterministic',()=>{
  const spec={key:'openrouter:example/free',providerId:'openrouter',modelId:'example/free'};
  assert.equal(modelLens(spec),modelLens(spec));
  assert.ok(['daily_content','commercial_reuse','editorial_experience','mixed_growth'].includes(modelLens(spec)));
});

test('Workers AI receives the daily-content lens',()=>{
  assert.equal(modelLens({key:'cloudflare_workers_ai:x',providerId:'cloudflare_workers_ai',modelId:'x'}),'daily_content');
});

test('an explicit safe Foundry lens overrides the provider default',()=>{
  assert.equal(modelLens({key:'cloudflare_workers_ai:x',providerId:'cloudflare_workers_ai',modelId:'x',lens:'editorial_experience'}),'editorial_experience');
  assert.equal(modelLens({key:'cloudflare_workers_ai:x',providerId:'cloudflare_workers_ai',modelId:'x',lens:'commercial_reuse'}),'commercial_reuse');
});
