import assert from 'node:assert/strict';
import { deriveOfferTelemetryLearning } from './offer-telemetry-learning.js';

const out=deriveOfferTelemetryLearning({
  interactionRows:[
    {event_type:'offer.exposure',offer_id:'high-ctr',route:'talk',count:100},
    {event_type:'offer.click',offer_id:'high-ctr',route:'talk',count:20},
    {event_type:'offer.exposure',offer_id:'low-ctr',route:'talk',count:100},
    {event_type:'offer.click',offer_id:'low-ctr',route:'talk',count:5},
    {event_type:'offer.exposure',offer_id:'middle',route:'talk',count:100},
    {event_type:'offer.click',offer_id:'middle',route:'talk',count:10},
    {event_type:'offer.exposure',offer_id:'small-sample',route:'talk',count:10},
    {event_type:'offer.click',offer_id:'small-sample',route:'talk',count:2}
  ],
  purchaseRows:[
    {offer_id:'middle',route:'talk',count:1},
    {offer_id:'wrong-route',route:'continuity',count:7}
  ],
  route:'talk'
});
assert.ok(out['high-ctr'].confidence_delta>0,'above-median CTR should raise the bounded signal');
assert.ok(out['low-ctr'].confidence_delta<0,'below-median CTR should lower the bounded signal');
assert.ok(out.middle.confidence_delta>0,'confirmed paid conversion should raise the bounded signal');
assert.equal(out['small-sample'],undefined,'small samples must not affect ranking');
assert.equal(out['wrong-route'],undefined,'route-specific feedback must not leak between routes');
assert.ok(out['high-ctr'].confidence_delta<=15&&out['high-ctr'].confidence_delta>=-20);
assert.ok(out.middle.observation_count>=3);

const prior=deriveOfferTelemetryLearning({
  interactionRows:[{event_type:'offer.click',offer_id:'already-known',route:'talk',count:4}],
  existing:{'already-known':{confidence_delta:14,observation_count:5}},
  route:'talk'
});
assert.equal(prior['already-known'].confidence_delta,14,'weak incremental evidence should preserve prior learning');
console.log('Offer telemetry feedback learning: OK');
