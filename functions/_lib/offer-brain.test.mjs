import assert from 'node:assert/strict';
import {recommendMaisonOffers} from './offer-brain.js';

const signal={result:'attachment',route:'talk',ranked:[{key:'attachment',score:8}]};
const baseline=recommendMaisonOffers(signal);
const tarotBefore=baseline.offers.find(x=>x.id==='tarot');
assert.ok(tarotBefore,'fixture should recommend tarot');

const learned=recommendMaisonOffers(signal,{
  tarot:{confidence_delta:-20,observation_count:20}
});
const tarotAfter=learned.offers.find(x=>x.id==='tarot');
assert.ok(tarotAfter,'bounded learning must not erase semantically relevant offer');
assert.ok(tarotAfter.score < tarotBefore.score,'negative learning should reduce ranking score');
assert.ok(tarotAfter.reasonCodes.includes('learned_negative'));

const ignored=recommendMaisonOffers(signal,{
  tarot:{confidence_delta:-20,observation_count:2}
});
assert.equal(ignored.offers.find(x=>x.id==='tarot').score,tarotBefore.score,'insufficient evidence must not alter recommendation');
console.log('offer-brain learning tests: ok');
