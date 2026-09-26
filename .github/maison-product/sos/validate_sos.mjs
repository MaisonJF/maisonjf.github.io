import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  SOS_PRODUCT,
  deriveSosState,
  confirmPresence,
  decideSosAction,
  buildSosAggregateSignal
} from '../../../functions/_lib/sos-maison-core.js';

const root=new URL('../../../',import.meta.url);
const readJson=rel=>JSON.parse(fs.readFileSync(new URL(rel,root),'utf8'));

const product=readJson('.github/maison-product/sos/product-contract.json');
const data=readJson('.github/maison-product/sos/operational-data-contract.json');
const brain=readJson('.github/maison-product/sos/brain-signal-contract.json');
const projection=readJson('.github/maison-product/sos/a2-projection-contract.json');
const sources=readJson('.github/maison-growth/a2/source-registry.json');

assert.equal(product.primary_action,'ESTOU AQUI');
assert.equal(product.external_effects.production_notifications_enabled,false);
assert.equal(product.convergence.canonical_event_boundary,'A1/A2');
assert.equal(product.convergence.separate_brain_created,false);
assert.equal(data.domains.brain_projection.purpose,'aggregate product learning only');
assert.equal(brain.aggregate_only,true);
assert.deepEqual([...projection.signals].sort(),[...brain.signal_kinds].sort());

const base={
  activated_at:'2026-09-25T08:00:00.000Z',
  trusted_contact_verified:true,
  next_due_at:'2026-09-26T08:00:00.000Z',
  cadence_hours:24,
  timezone:'Europe/Lisbon',
  checkin_local_time:'20:00',
  grace_minutes:60,
  reminder_sent_for_due_at:null,
  trusted_notice_sent_for_due_at:null,
  paused_at:null
};

assert.equal(deriveSosState({},'2026-09-25T09:00:00.000Z'),'setup');
assert.equal(deriveSosState(base,'2026-09-26T07:59:59.000Z'),'safe');
assert.equal(deriveSosState(base,'2026-09-26T08:00:00.000Z'),'due');
assert.deepEqual(
  decideSosAction(base,'2026-09-26T08:01:00.000Z'),
  {kind:'send_user_reminder',for_due_at:base.next_due_at}
);

const reminded={...base,reminder_sent_for_due_at:base.next_due_at};
assert.equal(deriveSosState(reminded,'2026-09-26T08:30:00.000Z'),'grace');
assert.equal(deriveSosState(reminded,'2026-09-26T09:00:00.000Z'),'contact_due');
assert.deepEqual(
  decideSosAction(reminded,'2026-09-26T09:01:00.000Z'),
  {kind:'send_trusted_notice',for_due_at:base.next_due_at}
);

const notified={...reminded,trusted_notice_sent_for_due_at:base.next_due_at};
assert.equal(decideSosAction(notified,'2026-09-26T09:01:00.000Z').kind,'none');

const paused={...base,paused_at:'2026-09-25T12:00:00.000Z'};
assert.equal(deriveSosState(paused,'2026-09-27T12:00:00.000Z'),'paused');
assert.equal(decideSosAction(paused,'2026-09-27T12:00:00.000Z').kind,'none');

const checked=confirmPresence(base,'2026-09-25T12:00:00.000Z');
assert.equal(checked.last_checkin_at,'2026-09-25T12:00:00.000Z');
assert.equal(checked.next_due_at,'2026-09-26T19:00:00.000Z');
assert.equal(checked.reminder_sent_for_due_at,null);

const signal=buildSosAggregateSignal({
  signalKind:'checkin_completed',
  count:17,
  cadenceBucket:'daily',
  deliveryOutcome:'not_applicable'
});
assert.equal(signal.source,'sos_product');
assert.equal(signal.privacy_class,'aggregated');
assert.deepEqual(
  Object.keys(signal.metadata).sort(),
  ['cadence_bucket','count','delivery_outcome','product_id','product_version','signal_kind'].sort()
);
assert.equal(JSON.stringify(signal).includes('@'),false);
assert.equal(JSON.stringify(signal).toLowerCase().includes('phone'),false);
const pausedSignal=buildSosAggregateSignal({signalKind:'paused',count:3,cadenceBucket:'daily',deliveryOutcome:'not_applicable'});
assert.equal(pausedSignal.metadata.signal_kind,'paused');
assert.equal(pausedSignal.metadata.count,3);

const source=sources.sources.sos_product;
assert.ok(source,'A2 must register sos_product');
assert.deepEqual(source.privacy_class.sort(),['aggregated','system']);
assert.ok(source.allowed_event_prefixes.includes('sos.'));
for(const forbidden of ['email','phone','name','location','reason','message','user_id','contact_id']){
  assert.equal(Object.hasOwn(source.metadata,forbidden),false,'forbidden A2 metadata: '+forbidden);
}

assert.equal(SOS_PRODUCT.primaryAction,'ESTOU AQUI');
console.log('SOS Maison JF foundation: OK');
