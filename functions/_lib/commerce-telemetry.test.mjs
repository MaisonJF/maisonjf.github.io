import test from 'node:test';
import assert from 'node:assert/strict';
import { recordB2bLifecycleEvent } from './commerce-telemetry.js';

const SOL='sol_018f4f0f-6c00-7000-8000-000000000001';

class Statement {
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async first(){
    if(/FROM solutions/.test(this.sql))return {solution_id:SOL};
    if(/FROM events/.test(this.sql)){
      const [key]=this.params;
      return this.db.events.get(key)||null;
    }
    if(/FROM idempotency_registry/.test(this.sql)){
      const [,key]=this.params;
      return this.db.registry.get(key)||null;
    }
    return null;
  }
}
class FakeDB {
  constructor(){this.events=new Map();this.registry=new Map();this.lastMetadata=null;}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){
    const event=statements[0].params;
    const registry=statements[1].params;
    this.events.set(event[1],{event_id:event[0],payload_hash:event[8]});
    this.registry.set(registry[1],{object_id:registry[2],payload_hash:registry[3]});
    this.lastMetadata=JSON.parse(event[9]);
    return statements.map(()=>({success:true}));
  }
}

function lead(overrides={}){
  return {
    event_type:'b2b.lead',
    idempotency_key:'b2b:lead:test-0001',
    occurred_at:'2026-09-25T12:00:00Z',
    journey_id:'jrn_018f4f0f-6c00-7000-8000-000000000002',
    metadata:{
      interest:'b2b',origin:'profissionais',business:'spa',goal:'diferenciar',
      gap:'fim',client:'recorrente',model:'ambos',scale:'pequeno',
      start:'piloto',result_type:'signature'
    },
    ...overrides
  };
}

test('accepts exact non-PII lead contract and persists through central A1 stores',async()=>{
  const db=new FakeDB();
  const result=await recordB2bLifecycleEvent(db,lead());
  assert.equal(result.status,'accepted');
  assert.equal(db.lastMetadata.business,'spa');
  assert.equal(db.lastMetadata.result_type,'signature');
  assert.equal(db.events.size,1);
  assert.equal(db.registry.size,1);
});

test('rejects unknown identity/free-text metadata fields',async()=>{
  const db=new FakeDB();
  await assert.rejects(
    ()=>recordB2bLifecycleEvent(db,lead({metadata:{business:'spa',email:'person@example.com'}})),
    /unsupported_b2b_metadata/
  );
});

test('rejects email-like values even inside an allowed token field',async()=>{
  const db=new FakeDB();
  await assert.rejects(
    ()=>recordB2bLifecycleEvent(db,lead({metadata:{business:'person@example.com'}})),
    /invalid_b2b_metadata/
  );
});

test('same idempotency key is duplicate only for the same canonical payload',async()=>{
  const db=new FakeDB();
  assert.equal((await recordB2bLifecycleEvent(db,lead())).status,'accepted');
  assert.equal((await recordB2bLifecycleEvent(db,lead())).status,'duplicate');
  await assert.rejects(
    ()=>recordB2bLifecycleEvent(db,lead({metadata:{business:'loja'}})),
    /idempotency_conflict/
  );
});

test('later B2B stages reuse the same adapter without customer identity',async()=>{
  const db=new FakeDB();
  const result=await recordB2bLifecycleEvent(db,{
    event_type:'b2b.pilot',
    idempotency_key:'b2b:pilot:test-0001',
    metadata:{b2b_stage:'pilot',offer_family:'workshop',business:'organizacao'}
  });
  assert.equal(result.status,'accepted');
  assert.equal(db.lastMetadata.b2b_stage,'pilot');
});
