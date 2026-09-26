import assert from 'node:assert/strict';
import {
  recommendationFromReferer,
  normalizeCheckoutAttribution,
  appendCheckoutAttribution
} from './checkout-attribution.js';

const origin='https://maison-jf.com';

const rec=recommendationFromReferer(
  origin+'/oraculo/amor?mj_source=vpc&mj_offer=oracle-seen&mj_result=afeto-palavras&mj_route=test&mj_brain=2026-09-22-v6',
  origin
);
assert.deepEqual(rec,{
  recommendation_source:'vpc',
  recommendation_offer:'oracle-seen',
  recommendation_result:'afeto-palavras',
  recommendation_route:'test',
  recommendation_brain:'2026-09-22-v6'
});

assert.deepEqual(
  recommendationFromReferer('https://example.org/?mj_source=vpc&mj_offer=oracle-seen',origin),
  {}
);

const merged=normalizeCheckoutAttribution(
  {
    recommendation_offer:'tarot',
    acquisition_referrer:'example.org',
    acquisition_landing:'/teste/afeto',
    acquisition_utm_source:'newsletter',
    acquisition_utm_campaign:'setembro 2026'
  },
  origin+'/?mj_source=vpc&mj_offer=oracle-seen&mj_result=attachment',
  origin
);
assert.equal(merged.recommendation_offer,'tarot','explicit session attribution wins over Referer');
assert.equal(merged.recommendation_source,'vpc');
assert.equal(merged.acquisition_referrer,'example.org');
assert.equal(merged.acquisition_utm_campaign,'setembro 2026');

const noPii=normalizeCheckoutAttribution({
  recommendation_offer:'person@example.org',
  acquisition_utm_campaign:'buyer@example.org'
});
assert.equal(noPii.recommendation_offer,undefined);
assert.equal(noPii.acquisition_utm_campaign,undefined);

const refererDoesNotCreateAcquisition=normalizeCheckoutAttribution(
  {},
  origin+'/?mj_source=vpc&mj_offer=pdi-relacoes&utm_source=secret',
  origin
);
assert.equal(refererDoesNotCreateAcquisition.recommendation_offer,'pdi-relacoes');
assert.equal(refererDoesNotCreateAcquisition.acquisition_utm_source,undefined);

const params=new URLSearchParams();
appendCheckoutAttribution(
  params,
  {recommendation_offer:'tarot',acquisition_utm_source:'newsletter'},
  '',
  origin
);
assert.equal(params.get('metadata[rec_offer]'),'tarot');
assert.equal(params.get('metadata[utm_source]'),'newsletter');

console.log('checkout attribution tests: ok');
