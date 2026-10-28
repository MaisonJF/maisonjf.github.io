import assert from 'node:assert/strict';
import { recordStripePurchase } from './commerce-events.js';

class FakeD1 {
  constructor(){this.rows=[];}
  prepare(sql){
    const db=this;
    return {
      bind(...args){
        return {
          first:async()=>{
            if(!sql.includes('SELECT event_id FROM events'))throw new Error('unexpected select');
            return db.rows.find(row=>row.source===args[0]&&(row.idempotency_key===args[1]||row.idempotency_key===args[2]))||null;
          },
          run:async()=>{
            if(!sql.includes('INSERT OR IGNORE INTO events'))throw new Error('unexpected write');
            const metadata=JSON.parse(args[8]);
            db.rows.push({
              event_id:args[0],idempotency_key:args[1],event_type:args[2],source:args[3],
              value_minor:args[5],currency:args[6],metadata
            });
            return {success:true};
          }
        };
      }
    };
  }
}

const db=new FakeD1();
const session={
  id:'cs_live_1234567890',
  payment_status:'paid',
  amount_total:500,
  currency:'eur',
  created:1792000000,
  metadata:{
    environment:'maison-jf-live',
    source:'ebooks-live',
    ebook_ids:'book-one,book-two',
    ebook_locale:'pt-PT',
    rec_source:'vpc',
    rec_offer:'ebook-collection',
    rec_result:'self',
    rec_route:'selfpaced',
    rec_brain:'offer-brain-v8'
  }
};
assert.equal(await recordStripePurchase(db,session),true);
assert.equal(db.rows.length,1);
const purchase=db.rows[0];
assert.equal(purchase.event_type,'commerce.purchase_confirmed');
assert.equal(purchase.value_minor,500);
assert.equal(purchase.metadata.ebook_ids,'book-one,book-two');
assert.equal(purchase.metadata.recommendation_offer,'ebook-collection');
assert.equal(purchase.metadata.recommendation_result,'self');
assert.equal(purchase.metadata.recommendation_route,'selfpaced');
assert.equal(JSON.stringify(purchase.metadata).includes('cs_live_1234567890'),false,'raw Stripe session ID must not be stored');
assert.equal(await recordStripePurchase(db,session),true);
assert.equal(db.rows.length,1,'recording the same paid session twice must be idempotent');

const gameDb=new FakeD1();
await recordStripePurchase(gameDb,{
  ...session,id:'cs_live_game123',
  metadata:{source:'para-de-ignorar-live',pdi_theme:'relacoes',pdi_mode:'group',pdi_locale:'pt-PT',rec_offer:'game-duo'}
});
assert.equal(gameDb.rows[0].metadata.pdi_theme,'relacoes');
assert.equal(gameDb.rows[0].metadata.pdi_mode,'group');
assert.equal(gameDb.rows[0].metadata.recommendation_offer,'game-duo');
console.log('Commerce event attribution: OK');
