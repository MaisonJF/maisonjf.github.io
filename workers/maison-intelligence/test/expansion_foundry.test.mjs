import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExpansionPrompt, parseJsonObject, modelLens, storeCandidate } from '../src/expansion_foundry.js';

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

test('Foundry prompt is candidate-only, PT-PT and existing-assets first',()=>{
  const prompt=buildExpansionPrompt({spec:{key:'openrouter:test:free',providerId:'openrouter',modelId:'test:free'},context});
  assert.match(prompt,/FOUNDRY PRIVADA DE EXPANSÃO/i);
  assert.match(prompt,/nunca aproves, publiques, fixes preços, lances/i);
  assert.match(prompt,/PORTUGUÊS EUROPEU/i);
  assert.match(prompt,/REUTILIZA PRIMEIRO/i);
  assert.match(prompt,/Não proponhas “coaching”/i);
  assert.match(prompt,/reel/i);
  assert.match(prompt,/physical_product/i);
  assert.match(prompt,/revisão humana/i);
  assert.match(prompt,/OCEANS ESPECIALIZADOS ACTIVOS/i);
  assert.match(prompt,/ocean_proposal/i);
  assert.match(prompt,/related_ocean_keys/i);
  assert.match(prompt,/não inventes fontes/i);
  assert.match(prompt,/Ecommerce, customer journey, checkout, SEO/i);
  assert.match(prompt,/zero perguntas e zero blocos de Oráculo/i);
});

class CandidateStatement{
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async first(){return null;}
  async run(){this.db.writes.push({sql:this.sql,params:this.params});return {success:true};}
}
class CandidateDB{
  constructor(){this.writes=[];}
  prepare(sql){return new CandidateStatement(this,sql);}
}

test('misrouted ecommerce question is preserved as brand intelligence, not inserted into the Vault',async()=>{
  const db=new CandidateDB();
  const result=await storeCandidate({GROWTH_DB:db},{
    item:{
      candidate_type:'question',
      title:'Como aumentar a conversão do checkout?',
      body:'Melhorar o funil de vendas da loja.',
      rationale:'O sinal trata da operação ecommerce.',
      territory:'customer-journey',
      source_ocean_id:'customer-journey',
      payload:{theme:'customer-journey',stage:'open',exposure:'paid'}
    },
    spec:{providerId:'cloudflare_workers_ai',modelId:'mock-model'},
    context:{
      strongest_ocean:'customer-journey',
      signals:[{ocean_key:'customer-journey',summary:'Checkout e conversão da loja online.',themes:['checkout']}],
      focus_oceans:[{ocean_key:'customer-journey',display_name:'Customer Journey',mission:'Auditoria ecommerce.',focus:['checkout','conversion']}],
      ocean_catalog:[]
    }
  });
  assert.equal(result.candidate_type,'brand_intelligence');
  assert.equal(db.writes.length,1);
  assert.match(db.writes[0].sql,/INSERT INTO maison_candidate_inbox_v2/);
  assert.equal(db.writes[0].params[1],'brand_intelligence');
  const payload=JSON.parse(db.writes[0].params[10]);
  assert.equal(payload.requested_candidate_type,'question');
  assert.equal(payload.editorial_gate.eligible_for_question_or_oracle,false);
  assert.equal(payload.editorial_gate.reason_code,'ecommerce_operations');
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
