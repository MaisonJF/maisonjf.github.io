import assert from 'node:assert/strict';
import {recommendMaisonOffers,boundedLearningAdjustment} from './offer-brain.js';

assert.equal(boundedLearningAdjustment({confidence_delta:100,observation_count:20}),6);
assert.equal(boundedLearningAdjustment({confidence_delta:-100,observation_count:20}),-6);
assert.equal(boundedLearningAdjustment({confidence_delta:-20,observation_count:2}),0);

const signal={result:'attachment',route:'talk',ranked:[{key:'attachment',score:8}]};
const baseline=recommendMaisonOffers(signal);
const tarotBefore=baseline.offers.find(x=>x.id==='tarot');
assert.ok(tarotBefore,'fixture should recommend tarot');

const positive=recommendMaisonOffers(signal,{tarot:{confidence_delta:20,observation_count:20}});
const tarotPositive=positive.offers.find(x=>x.id==='tarot');
assert.ok(tarotPositive,'positive bounded learning should retain a strongly relevant offer');
assert.ok(tarotPositive.score>tarotBefore.score);
assert.ok(tarotPositive.reasonCodes.includes('learned_positive'));

const negative=recommendMaisonOffers(signal,{tarot:{confidence_delta:-20,observation_count:20}});
const tarotNegative=negative.offers.find(x=>x.id==='tarot');
if(tarotNegative){
  assert.ok(tarotNegative.score<tarotBefore.score);
  assert.ok(tarotNegative.reasonCodes.includes('learned_negative'));
} else {
  assert.ok(negative.offers.some(x=>x.slot==='consultation'),'negative learning may change the selected consultation, not remove the slot');
}

const ignored=recommendMaisonOffers(signal,{tarot:{confidence_delta:-20,observation_count:2}});
assert.equal(ignored.offers.find(x=>x.id==='tarot').score,tarotBefore.score,'insufficient evidence must not alter recommendation');
console.log('offer-brain learning tests: ok');
