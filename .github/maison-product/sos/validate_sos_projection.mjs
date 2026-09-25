import assert from 'node:assert/strict';
import { buildSosA2AggregateEvent } from '../../../functions/_lib/sos-brain-projection.js';

const event=buildSosA2AggregateEvent({
  date:'2026-09-25',
  signalKind:'checkin_completed',
  count:42
});
assert.equal(event.contract_version,1);
assert.equal(event.source,'sos_product');
assert.equal(event.event_type,'sos.aggregate');
assert.equal(event.privacy_class,'aggregated');
assert.equal(event.occurred_at,'2026-09-25T23:59:59.999Z');
assert.equal(event.metadata.count,42);
assert.deepEqual(
  Object.keys(event.metadata).sort(),
  ['cadence_bucket','count','delivery_outcome','product_id','product_version','signal_kind'].sort()
);
for(const forbidden of ['email','phone','name','account','contact','location','message','reason','free_text']){
  assert.equal(Object.hasOwn(event.metadata,forbidden),false);
}
assert.throws(()=>buildSosA2AggregateEvent({
  date:'25-09-2026',signalKind:'checkin_completed',count:1
}),/invalid_sos_aggregate_day/);
console.log('SOS A2 projection: OK');
