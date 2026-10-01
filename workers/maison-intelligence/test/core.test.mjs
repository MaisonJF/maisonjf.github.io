import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeUrl, uniqueCanonicalUrls, territoriesForDate, buildSensorPrompt, privacySafeText, ATELIER_TERRITORY, DISCOVERY_TERRITORY } from '../src/core.js';

test('canonical URLs collapse tracking variants', () => {
  assert.equal(canonicalizeUrl('https://www.Example.com/a/?utm_source=x&b=2'), 'https://example.com/a?b=2');
});

test('echo roots are deduplicated', () => {
  assert.deepEqual(uniqueCanonicalUrls(['https://example.com/x?utm_source=a','https://www.example.com/x']), ['https://example.com/x']);
});

test('territory rotation is deterministic inside each 3-hour slot', () => {
  const a = territoriesForDate(new Date('2026-09-22T00:00:00Z'), 2);
  const b = territoriesForDate(new Date('2026-09-22T02:59:00Z'), 2);
  assert.deepEqual(a,b);
});

test('territory rotation advances between 3-hour slots', () => {
  const a = territoriesForDate(new Date('2026-09-22T00:00:00Z'), 2);
  const b = territoriesForDate(new Date('2026-09-22T03:00:00Z'), 2);
  assert.notDeepEqual(a,b);
});

test('organic discovery prompt enforces zero-cost latent-demand acquisition', () => {
  const prompt = buildSensorPrompt(DISCOVERY_TERRITORY);
  assert.match(prompt, /do not yet know MAISON JF/i);
  assert.match(prompt, /Zero-cost first/i);
  assert.match(prompt, /this is about me/i);
  assert.match(prompt, /qualified organic visits/i);
  assert.match(prompt, /do not publish, contact anyone, spend money/i);
});

test('sensor prompt forbids personal identifiers', () => {
  assert.match(buildSensorPrompt({query:'work'}), /Do not collect names/i);
});

test('PII-looking contact details are redacted', () => {
  const s=privacySafeText('mail a@b.com or +351 912 345 678');
  assert.ok(!s.includes('a@b.com'));
  assert.ok(!s.includes('912 345 678'));
});

test('Atelier prompt studies transferable excellence without copying', () => {
  const prompt = buildSensorPrompt(ATELIER_TERRITORY);
  assert.match(prompt, /Study excellence, not audience demand/i);
  assert.match(prompt, /Martha Stewart/i);
  assert.match(prompt, /Fame is not evidence of excellence/i);
  assert.match(prompt, /Never copy voice/i);
  assert.match(prompt, /measurable hypothesis/i);
  assert.match(prompt, /Zero-cost first/i);
});
