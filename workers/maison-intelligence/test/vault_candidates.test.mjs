import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestVaultCandidate } from '../src/vault_candidates.js';

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async first(){
    this.db.reads.push({sql:this.sql,params:this.params});
    return this.db.duplicateRow;
  }
}
class DB{
  constructor(){this.reads=[];this.batches=[];this.duplicateRow=null;}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){
    this.batches.push(statements.map(s=>({sql:s.sql,params:s.params})));
    return statements.map(()=>({success:true}));
  }
}

test('question candidate is stored private and cannot become live automatically',async()=>{
  const db=new DB();
  const out=await ingestVaultCandidate({GROWTH_DB:db},{
    content_type:'question',
    source_ocean_id:'tempo-meu-a-noite',
    theme:'relacoes',
    text:'Que parte de ti fica por dizer para manter a paz entre os dois?',
    stage:'deepen',
    exposure:'paid',
    intensity:3,
    product_fit:{para_de_ignorar:1}
  });
  assert.equal(out.content_type,'question');
  assert.equal(out.status,'candidate');
  assert.equal(out.lifecycle_state,'candidate');
  assert.equal(out.rotation_state,'new');
  assert.equal(out.editorial_review_required,true);
  assert.equal(out.automatic_activation,false);
  assert.equal(out.github_body_persistence,false);
  assert.equal(out.storage,'D1');
  assert.equal(db.reads.length,1);
  assert.equal(db.batches.length,1);
  assert.equal(db.batches[0].length,2);
  assert.match(db.batches[0][0].sql,/INSERT INTO vault_questions/);
  assert.match(db.batches[0][1].sql,/INSERT INTO vault_editorial_decisions/);
  assert.match(db.batches[0][1].sql,/'propose'/);
});

test('Oracle block candidate is stored as candidate with editorial proposal',async()=>{
  const db=new DB();
  const out=await ingestVaultCandidate({GROWTH_DB:db},{
    content_type:'oracle_block',
    source_ocean_id:'perda-ambigua-sem-fecho-claro',
    territory:'amor',
    role:'reframe',
    title:'O que continua sem nome',
    text:'Nem tudo o que fica por fechar precisa de ser forçado a terminar hoje. Há vínculos que primeiro precisam de mudar de lugar dentro de ti.',
    intensity:3,
    tone:'intimate',
    rarity:'uncommon',
    tags:['perda','fecho']
  });
  assert.equal(out.content_type,'oracle_block');
  assert.equal(out.status,'candidate');
  assert.equal(out.lifecycle_state,'candidate');
  assert.equal(out.automatic_activation,false);
  assert.equal(db.batches.length,1);
  assert.equal(db.batches[0].length,2);
  assert.match(db.batches[0][0].sql,/INSERT INTO vault_oracle_blocks/);
  assert.match(db.batches[0][1].sql,/'propose'/);
});

test('candidate ingest refuses editorial authority from caller',async()=>{
  const db=new DB();
  await assert.rejects(
    ingestVaultCandidate({GROWTH_DB:db},{
      content_type:'question',
      source_ocean_id:'teste-ocean',
      theme:'relacoes',
      text:'Uma pergunta suficientemente longa para o teste.',
      status:'active'
    }),
    /editorial_authority_forbidden/
  );
  assert.equal(db.batches.length,0);
});

test('candidate ingest rejects PII-looking bodies',async()=>{
  const db=new DB();
  await assert.rejects(
    ingestVaultCandidate({GROWTH_DB:db},{
      content_type:'oracle_block',
      source_ocean_id:'teste-ocean',
      territory:'amor',
      role:'opening',
      text:'Escreve para pessoa@example.com e depois continua esta leitura.'
    }),
    /candidate_pii_detected/
  );
  assert.equal(db.batches.length,0);
});

test('semantic duplicate is returned without another insert',async()=>{
  const db=new DB();
  db.duplicateRow={id:'q_existing'};
  const out=await ingestVaultCandidate({GROWTH_DB:db},{
    content_type:'question',
    source_ocean_id:'teste-ocean',
    theme:'relacoes',
    text:'Uma pergunta suficientemente longa para identificar duplicados.'
  });
  assert.equal(out.duplicate,true);
  assert.equal(out.content_id,'q_existing');
  assert.equal(db.batches.length,0);
});
