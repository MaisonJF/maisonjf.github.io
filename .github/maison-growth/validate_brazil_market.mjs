import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  brazilMarketAccessResponse,
  brazilSessionEligibilityResponse,
  hasBrazilBillingAddress,
  hasEligibleBrazilSession
} from '../../functions/_lib/brazil-market.js';
import { expectedEbookSessionAmount } from '../../functions/_lib/ebooks-live.js';

function requestFrom(country) {
  const request = new Request('https://maison-jf.com/api/test', { method: 'POST' });
  Object.defineProperty(request, 'cf', { value: { country } });
  return request;
}

// Only server-side Cloudflare country metadata may enable BRL pricing.
assert.equal(brazilMarketAccessResponse(requestFrom('BR'), 'pt-BR'), null);
assert.equal(brazilMarketAccessResponse(requestFrom('PT'), 'pt-BR')?.status, 403);
assert.equal(brazilMarketAccessResponse(requestFrom(null), 'pt-BR')?.status, 403);
assert.equal(brazilMarketAccessResponse(requestFrom('PT'), 'pt-PT'), null);

const eligibleSession = {
  currency: 'brl',
  amount_total: 2190,
  customer_details: { address: { country: 'BR' } }
};
assert.equal(hasBrazilBillingAddress(eligibleSession), true);
assert.equal(hasEligibleBrazilSession(eligibleSession, 2190), true);
assert.equal(brazilSessionEligibilityResponse(eligibleSession, 'pt-BR', 2190), null);
assert.equal(hasEligibleBrazilSession({ ...eligibleSession, amount_total: 2490 }, 2190), false);
assert.equal(hasEligibleBrazilSession({
  ...eligibleSession,
  customer_details: { address: { country: 'PT' } }
}, 2190), false);
assert.equal(brazilSessionEligibilityResponse({
  ...eligibleSession,
  customer_details: { address: { country: 'US' } }
}, 'pt-BR', 2190)?.status, 403);
assert.equal(brazilSessionEligibilityResponse(eligibleSession, 'pt-PT', 2190), null);

// Guard against accidentally wiring only the checkout-creation side.
const source = path => readFileSync(path, 'utf8');

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

const apiFiles = walkFiles('functions/api').filter(path => path.endsWith('.js'));
const checkoutCreators = apiFiles.filter(path => {
  const code = source(path);
  return code.includes('/v1/checkout/sessions') && /method\s*:\s*['"]POST['"]/.test(code);
});

for (const path of checkoutCreators) {
  const code = source(path);
  const hasMarketGate = code.includes('brazilMarketAccessResponse');
  const hasReasonedExemption = /BRAZIL_MARKET_EXEMPT:\s*[^\n]{20,}/.test(code);
  assert.ok(
    hasMarketGate || hasReasonedExemption,
    `${path} creates Stripe Checkout but has neither the Brazil-market eligibility gate nor a reasoned BRAZIL_MARKET_EXEMPT exception. See .github/maison-growth/commerce/BRAZIL-MARKET-PRICING-POLICY.md`
  );
}

const paidSessionResolvers = apiFiles.filter(path => {
  const code = source(path);
  return code.includes('/v1/checkout/sessions/') && code.includes('payment_status');
});

for (const path of paidSessionResolvers) {
  const code = source(path);
  const hasDeliveryGate = code.includes('brazilSessionEligibilityResponse');
  const hasReasonedExemption = /BRAZIL_MARKET_FULFILLMENT_EXEMPT:\s*[^\n]{20,}/.test(code);
  assert.ok(
    hasDeliveryGate || hasReasonedExemption,
    `${path} reads paid Stripe sessions but has neither Brazil digital-fulfillment validation nor a reasoned BRAZIL_MARKET_FULFILLMENT_EXEMPT exception. See .github/maison-growth/commerce/BRAZIL-MARKET-PRICING-POLICY.md`
  );
}

const policy = source('.github/maison-growth/commerce/BRAZIL-MARKET-PRICING-POLICY.md');
assert.ok(policy.includes('Idioma não é elegibilidade.'));
assert.ok(policy.includes('Validação antes da entrega.'));
assert.ok(policy.includes('VPNs e moradas falsas'));
assert.ok(source('functions/_lib/offer-brain.js').includes('brazilDigitalMarket:'));

for (const [path, token] of [
  ['functions/api/create-checkout-live.js', 'brazilMarketAccessResponse'],
  ['functions/api/create-oracle-checkout-live.js', 'brazilMarketAccessResponse'],
  ['functions/api/create-pdi-checkout-live.js', 'brazilMarketAccessResponse'],
  ['functions/api/checkout-session-live.js', 'brazilSessionEligibilityResponse'],
  ['functions/api/ebook-download-live.js', 'brazilSessionEligibilityResponse'],
  ['functions/api/oracle-reading-live.js', 'brazilSessionEligibilityResponse'],
  ['functions/api/pdi-session-live.js', 'brazilSessionEligibilityResponse']
]) {
  assert.ok(source(path).includes(token), `${path} must enforce the Brazil eligibility helper`);
}

assert.equal(expectedEbookSessionAmount({
  currency: 'brl', amount_total: 2190, metadata: { expected_amount_total: '2190' }
}, ['para-de-ignorar'], 'pt-BR'), 2190);
assert.equal(expectedEbookSessionAmount({
  currency: 'brl', amount_total: 2490, metadata: {}
}, ['para-de-ignorar'], 'pt-BR'), 2490);
assert.equal(expectedEbookSessionAmount({
  currency: 'brl', amount_total: 9990, metadata: {}
}, ['para-de-ignorar'], 'pt-BR'), null);
assert.ok(source('functions/_lib/ebooks-live.js').includes('brlCents: 2190'));
assert.ok(source('functions/_lib/ebooks-live.js').includes('legacyBrlCents: [2490]'));
assert.ok(source('data/ebooks.js').includes('brlPrice:21.90'));
assert.ok(source('functions/_lib/site-localizer.js').includes("'/ebooks/para-de-ignorar': '21.90'"));
assert.ok(source('functions/_lib/offer-brain.js').includes("'ebook-para-de-ignorar':'R$ 21,90'"));

console.log('Brazil market gate, Stripe billing eligibility, session-price checks and R$21,90 ebook price validated.');
