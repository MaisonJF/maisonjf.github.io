import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCandidateInbox, ingestCandidateInbox, listCandidateInbox } from '../src/candidate_inbox.js';

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async first(){
    this.db.reads.push({sql:this.sql,params:this.params});
    return this.db.duplicateRow;
  }
  async run(){
    this.db.writes.push({sql:this.sql,params:this.params});
    return {success:true,meta:{changes:1}};
  }
  async all(){
    this.db.reads.push({sql:this.sql,params:this.params});
    return {results:this.db.rows||[]};
  }
}
class DB{
  constructor(){this.reads=[];this.writes=[];this.rows=[];this.duplicateRow=null;}
  prepare(sql){return new Statement(this,sql);}
}

test('generic expansion candidate stays private and review-only',async()=>{
  const db=new DB();
  const out=await ingestCandidateInbox({GROWTH_DB:db},{
    candidate_type:'bundle',
    source_ocean_id:'transicao-trabalho-casa',
    provider_id:'openrouter',
    model_id:'example/free',
    territory:'casa',
    title:'Cheguei a Casa',
    body:'Névoa, vela pequena e um ritual curto de transição ao chegar a casa.',
    rationale:'Reutiliza produtos já existentes para responder a uma tensão repetida.',
    related_assets:['Névoa de Ambiente 20 ml','Vela Aromática 70 g'],
    evidence_refs:['https://example.org/a?utm_source=x'],
    reuse_existing_score:95
  });
  assert.equal(out.candidate_type,'bundle');
  assert.equal(out.status,'candidate');
  assert.equal(out.lifecycle_state,'candidate');
  assert.equal(out.rotation_state,'new');
  assert.equal(out.editorial_review_required,true);
  assert.equal(out.automatic_activation,false);
  assert.equal(out.public_side_effects,false);
  assert.equal(db.writes.length,1);
  assert.match(db.writes[0].sql,/INSERT INTO maison_candidate_inbox/);
});

test('generic candidate rejects caller authority',async()=>{
  const db=new DB();
  await assert.rejects(
    ingestCandidateInbox({GROWTH_DB:db},{
      candidate_type:'reel',
      source_ocean_id:'teste',
      title:'Tema',
      body:'Conteúdo suficientemente explícito para o teste.',
      rationale:'Teste.',
      live:true
    }),
    /candidate_authority_forbidden/
  );
  assert.equal(db.writes.length,0);
});

test('semantic duplicate does not write twice',async()=>{
  const db=new DB();
  db.duplicateRow={candidate_id:'mci_existing'};
  const out=await ingestCandidateInbox({GROWTH_DB:db},{
    candidate_type:'post',
    source_ocean_id:'teste',
    title:'Chegaste mas ainda estás no trabalho',
    body:'Uma proposta editorial sobre a passagem entre trabalho e casa.',
    rationale:'Sinal recorrente.'
  });
  assert.equal(out.duplicate,true);
  assert.equal(out.candidate_id,'mci_existing');
  assert.equal(db.writes.length,0);
});

test('candidate inbox returns parsed private rows',async()=>{
  const db=new DB();
  db.rows=[{
    candidate_id:'mci_x',candidate_type:'reel',source_ocean_id:'ocean-x',
    provider_id:'openrouter',model_id:'free',territory:'casa',
    title:'Chegaste',body:'Mas ainda não saíste do trabalho.',rationale:'Teste',
    payload_json:'{"hook":"Chegaste."}',evidence_refs_json:'["https://example.org/a"]',
    related_assets_json:'["Névoa"]',novelty_score:70,maison_fit_score:90,
    feasibility_score:95,demand_score:70,commercial_score:60,reuse_existing_score:90,
    created_at:'2026-10-01T18:00:00Z',latest_decision:null,latest_decision_at:null
  }];
  const rows=await listCandidateInbox({GROWTH_DB:db},{limit:10});
  assert.equal(rows.length,1);
  assert.equal(rows[0].payload.hook,'Chegaste.');
  assert.deepEqual(rows[0].related_assets,['Névoa']);
  assert.equal(rows[0].payload_json,undefined);
});


class OceanProposalStatement extends Statement {
  async first() {
    this.db.reads.push({sql:this.sql,params:this.params});
    if (this.sql.includes('SELECT candidate_id,candidate_type,title,body,payload_json FROM maison_candidate_inbox_v2')) return this.db.proposal;
    if (this.sql.includes('SELECT ocean_key FROM ocean_specialist_registry')) return null;
    return null;
  }
}

class OceanProposalDB extends DB {
  constructor(proposal) { super(); this.proposal=proposal; this.batchCalls=[]; }
  prepare(sql) { return new OceanProposalStatement(this,sql); }
  async batch(statements) {
    this.batchCalls.push(...statements.map(statement=>({sql:statement.sql,params:statement.params})));
    return Promise.all(statements.map(statement=>statement.run()));
  }
}

test('approving a first-class Ocean proposal opens a specialist Ocean only after human review',async()=>{
  const payload={
    proposal_kind:'ocean_proposal',
    proposed_ocean_key:'seasonal-room-scent-gifting',
    display_name:'Seasonal Room Scent & Gifting',
    pillar_key:'scent-product-formulation',
    mission:'Investigar ocasiões sazonais em que uma experiência aromática possa ser descoberta, oferecida ou combinada com outros produtos.',
    focus:['datas e ocasiões','aromas de oferta','conjuntos e apresentação'],
    connections:['home-fragrance','supplier-intelligence','emotional-gifting']
  };
  const db=new OceanProposalDB({
    candidate_id:'mci_demo',candidate_type:'ocean_proposal',
    title:'Proposta de novo Ocean: Seasonal Room Scent & Gifting',
    body:payload.mission,payload_json:JSON.stringify(payload)
  });
  const out=await decideCandidateInbox({GROWTH_DB:db},{
    candidate_id:'mci_demo',decision:'approve',
    reason:'Território distinto com âmbito e ligações claros.'
  });
  assert.equal(out.ocean_registered,'seasonal-room-scent-gifting');
  assert.equal(out.ocean_lifecycle_state,'open');
  assert.equal(out.live,false);
  assert.equal(out.automatic_activation,false);
  assert.equal(out.public_side_effects,false);
  assert.ok(db.batchCalls.some(item=>item.sql.includes('INSERT INTO maison_candidate_decisions')));
  assert.ok(db.batchCalls.some(item=>item.sql.includes('INSERT INTO ocean_specialist_registry')));
});

test('human decision is append-only and never makes a candidate live',async()=>{
  const db=new DB();
  db.duplicateRow={candidate_id:'mci_demo'};
  const out=await decideCandidateInbox({GROWTH_DB:db},{
    candidate_id:'mci_demo',
    decision:'develop',
    reason:'Vale desenvolver esta proposta.'
  });
  assert.equal(out.decision,'develop');
  assert.equal(out.live,false);
  assert.equal(out.automatic_activation,false);
  assert.equal(out.public_side_effects,false);
  assert.equal(db.writes.length,1);
  assert.match(db.writes[0].sql,/INSERT INTO maison_candidate_decisions/);
});
