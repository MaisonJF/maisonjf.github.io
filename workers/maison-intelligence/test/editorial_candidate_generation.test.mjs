import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEditorialCandidates, candidatePrompt, parseJsonObject } from '../src/editorial_candidate_generation.js';

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
      classification:{eligible_destinations:['pdi_game','vpc_test','oracle'],reason_code:'human_lived_experience',reason:'O sinal descreve uma experiência humana concreta.'},
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
      classification:{eligible_destinations:['pdi_game','vpc_test','oracle'],reason_code:'human_lived_experience',reason:'O sinal descreve uma experiência humana concreta.'},
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

test('model drift is normalized and free-test coverage survives the expanded six-question cap',async()=>{
  const db=new DB();
  const caller=async()=>({
    providerId:'cloudflare_workers_ai',
    modelId:'llama-test',
    text:JSON.stringify({
      classification:{eligible_destinations:['pdi_game','vpc_test','oracle'],reason_code:'human_lived_experience',reason:'O sinal descreve uma experiência humana concreta.'},
      questions:[
        {theme:'escolha',text:'Que escolha tens adiado porque nenhuma opção te parece suficientemente segura?',stage:'open',exposure:'paid',cognitive_load:'alto',vulnerability:'moderado',conflict_potential:'baixo',playfulness:'baixo'},
        {theme:'escolha',text:'Quando aparecem demasiadas opções, qual é a primeira coisa em ti que deixa de confiar?',stage:'recognize',exposure:'paid',cognitive_load:'alto',vulnerability:'alto',conflict_potential:'moderado',playfulness:'baixo'},
        {theme:'escolha',text:'O que mudaria se hoje aceitasses escolher algo apenas suficientemente bom?',stage:'deepen',exposure:'paid',cognitive_load:'moderado',vulnerability:'moderado',conflict_potential:'baixo',playfulness:'moderado'},
        {theme:'escolha',text:'Que decisão estás a transformar num teste à tua própria competência?',stage:'touch',exposure:'paid',cognitive_load:'alto',vulnerability:'alto',conflict_potential:'alto',playfulness:'baixo'},
        {theme:'escolha',text:'Quando tens opções a mais, o que te ajudaria a voltar ao essencial?',stage:'open',exposure:'public_social',cognitive_load:'baixo',vulnerability:'baixo',conflict_potential:'baixo',playfulness:'moderado'}
      ],
      oracle_blocks:[]
    })
  });
  const out=await generateEditorialCandidates({GROWTH_DB:db},{caller,oceanContext,brainAlert});
  assert.equal(out.stored,5);
  assert.equal(out.rejected,0);
  assert.equal(db.batches.length,5);
  assert.ok(db.batches.some(batch=>batch[0].params[10]==='public_social'));
  for(const batch of db.batches){
    for(const index of [17,18,19,20]) assert.equal(typeof batch[0].params[index],'number');
  }
});

test('editorial prompt requires PT-PT and direct recognition questions',()=>{
  const prompt=candidatePrompt({oceanContext,brainAlert});
  assert.match(prompt,/PORTUGUÊS EUROPEU/i);
  assert.match(prompt,/sem pedir conselhos, estratégias ou ajuda/i);
  assert.match(prompt,/public_social/i);
  assert.match(prompt,/PÁRA DE IGNORAR!/i);
  assert.match(prompt,/tema canónico estável/i);
  assert.match(prompt,/classifica o destino antes de criares conteúdo/i);
  assert.match(prompt,/zero perguntas e zero blocos de Oráculo/i);
  assert.match(prompt,/Não forces uma pergunta gratuita/i);
  assert.match(prompt,/slug estável em minúsculas/i);
});

test('ecommerce signal is blocked before a model can write game or Oracle content',async()=>{
  const db=new DB();
  let providerCalled=false;
  const out=await generateEditorialCandidates({GROWTH_DB:db},{
    caller:async()=>{providerCalled=true;throw new Error('provider_should_not_be_called')},
    oceanContext:{oceanKey:'customer-journey',matchedTerms:['checkout','conversion']},
    brainAlert:{response_excerpt:'Analisar fricção no checkout e melhorar a conversão da loja online.'}
  });
  assert.equal(providerCalled,false);
  assert.equal(out.called,false);
  assert.equal(out.skipped,true);
  assert.equal(out.reason_code,'ecommerce_operations');
  assert.equal(out.stored,0);
  assert.equal(db.batches.length,0);
});

test('explicit no-destination classification stores no questions or Oracle blocks',async()=>{
  const db=new DB();
  const out=await generateEditorialCandidates({GROWTH_DB:db},{
    caller:async()=>({
      text:JSON.stringify({
        classification:{eligible_destinations:['other_maison_asset'],reason_code:'business_operational',reason:'É um tema de ecommerce.'},
        questions:[{theme:'customer-journey',text:'Como aumentas a conversão do checkout?',stage:'open',exposure:'paid'}],
        oracle_blocks:[{territory:'ecommerce',role:'recognition',title:'A conversão',text:'A tua loja pede clareza para vender mais.',intensity:2,tone:'direct',rarity:'common'}]
      })
    }),
    oceanContext:{oceanKey:'strategy-maison',matchedTerms:['commerce']},
    brainAlert:{response_excerpt:'Sinal de operação comercial.'}
  });
  assert.equal(out.called,true);
  assert.equal(out.skipped,true);
  assert.equal(out.reason_code,'business_operational');
  assert.equal(out.stored,0);
  assert.equal(db.batches.length,0);
});

test('candidate parser accepts fenced JSON but rejects missing JSON',()=>{
  assert.deepEqual(parseJsonObject('\\`\\`\\`json\n{"questions":[],"oracle_blocks":[]}\n\\`\\`\\`'),{
    questions:[],oracle_blocks:[]
  });
  assert.throws(()=>parseJsonObject('sem json'),/editorial_candidate_json_missing/);
});
