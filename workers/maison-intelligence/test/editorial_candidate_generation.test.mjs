import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEditorialCandidates, parseJsonObject } from '../src/editorial_candidate_generation.js';

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async first(){this.db.reads++;return null;}
}
class DB{
  constructor(){this.reads=0;this.batches=[];}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){
    this.batches.push(statements.map(s=>({sql:s.sql,params:s.params})));
    return statements.map(()=>({success:true}));
  }
}
const oceanContext={
  oceanKey:'auto-silenciamento-para-preservar-o-vinculo',
  matchedTerms:['engolir o que sinto','medo da reação']
};
const brainAlert={
  response_excerpt:'Pessoas descrevem ficar em silêncio para evitar conflito e preservar o vínculo.',
  ocean_alert_priority:82
};

test('editorial generation stores bounded question and Oracle candidates only',async()=>{
  const db=new DB();
  const caller=async()=>({
    providerId:'openrouter',
    modelId:'free-model',
    usage:{total_tokens:120},
    text:JSON.stringify({
      questions:[
        {
          theme:'relacoes',
          text:'O que deixas de dizer quando tens medo de que uma conversa mude a relação?',
          stage:'deepen',
          exposure:'paid',
          intensity:3,
          target:'self'
        },
        {
          theme:'relacoes',
          text:'Quando alguém fica mais frio, qual é a primeira coisa que assumes sobre ti?',
          stage:'recognize',
          exposure:'public_social',
          intensity:2,
          target:'self'
        }
      ],
      oracle_blocks:[
        {
          territory:'amor',
          role:'counterpoint',
          title:'O silêncio também escolhe',
          text:'Evitar uma conversa pode proteger o momento e, ao mesmo tempo, afastar-te daquilo que precisavas de tornar claro.',
          intensity:3,
          tone:'direct',
          rarity:'common'
        }
      ]
    })
  });
  const out=await generateEditorialCandidates({GROWTH_DB:db},{
    caller,oceanContext,brainAlert,providerId:'openrouter'
  });
  assert.equal(out.called,true);
  assert.equal(out.stored,3);
  assert.equal(out.duplicates,0);
  assert.equal(out.rejected,0);
  assert.equal(out.provider_id,'openrouter');
  assert.equal(out.model_id,'free-model');
  assert.equal(db.batches.length,3);
  for(const batch of db.batches){
    assert.equal(batch.length,2);
    assert.match(batch[1].sql,/INSERT INTO vault_editorial_decisions/);
    assert.match(batch[1].sql,/'propose'/);
  }
});

test('bad generated item is rejected without blocking valid siblings',async()=>{
  const db=new DB();
  const caller=async()=>({
    providerId:'openrouter',
    text:JSON.stringify({
      questions:[
        {theme:'relacoes',text:'Contacta pessoa@example.com para explicar o que sentes.',stage:'open'},
        {theme:'relacoes',text:'Que conversa continuas a adiar mesmo sabendo que precisas de a ter?',stage:'touch'}
      ],
      oracle_blocks:[]
    })
  });
  const out=await generateEditorialCandidates({GROWTH_DB:db},{caller,oceanContext,brainAlert});
  assert.equal(out.stored,1);
  assert.equal(out.rejected,1);
  assert.equal(db.batches.length,1);
});

test('candidate parser accepts fenced JSON but rejects missing JSON',()=>{
  assert.deepEqual(parseJsonObject('\\`\\`\\`json\n{"questions":[],"oracle_blocks":[]}\n\\`\\`\\`'),{
    questions:[],oracle_blocks:[]
  });
  assert.throws(()=>parseJsonObject('sem json'),/editorial_candidate_json_missing/);
});
