import test from 'node:test';
import assert from 'node:assert/strict';
import { recordStripePurchase } from '../../../functions/_lib/commerce-events.js';

class FakeD1 {
  constructor(existing=null){
    this.existing=existing;
    this.inserts=[];
    this.selects=[];
  }
  prepare(sql){
    const db=this;
    return {
      bind(...args){
        return {
          first:async()=>{
            db.selects.push({sql,args});
            return db.existing;
          },
          run:async()=>{
            db.inserts.push({sql,args});
            return {success:true};
          }
        };
      }
    };
  }
}

function session(id='cs_test_fixture_123'){
  return {
    id,
    payment_status:'paid',
    created:1790380800,
    amount_total:3500,
    currency:'eur',
    metadata:{source:'site',product_slug:'vela'}
  };
}

test('Stripe purchase analytics never persist the raw session id',async()=>{
  const raw='cs_test_fixture_123';
  const db=new FakeD1();
  const ok=await recordStripePurchase(db,session(raw));
  assert.equal(ok,true);
  assert.equal(db.inserts.length,1);
  const {sql,args}=db.inserts[0];
  assert.match(sql,/'pseudonymous'/);
  const idempotencyKey=args[1];
  const metadataJson=args.at(-1);
  assert.match(idempotencyKey,/^checkout:[0-9a-f]{64}$/);
  assert.equal(idempotencyKey.includes(raw),false);
  assert.equal(metadataJson.includes(raw),false);
  const metadata=JSON.parse(metadataJson);
  assert.match(metadata.stripe_session_ref_hash,/^[0-9a-f]{64}$/);
  assert.equal('stripe_session_id' in metadata,false);
});

test('Stripe writer recognises legacy raw-id idempotency without rewriting it',async()=>{
  const raw='cs_test_legacy_fixture';
  const db=new FakeD1({event_id:'evt_existing'});
  const ok=await recordStripePurchase(db,session(raw));
  assert.equal(ok,true);
  assert.equal(db.inserts.length,0);
  assert.equal(db.selects.length,1);
  assert.equal(db.selects[0].args[0],'stripe');
  assert.match(db.selects[0].args[1],/^checkout:[0-9a-f]{64}$/);
  assert.equal(db.selects[0].args[2],'checkout:'+raw);
});
