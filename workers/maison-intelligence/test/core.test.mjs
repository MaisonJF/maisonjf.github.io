import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeUrl, uniqueCanonicalUrls, territoriesForDate, buildSensorPrompt, privacySafeText } from '../src/core.js';

test('canonical URLs collapse tracking variants', () => {
  assert.equal(canonicalizeUrl('https://www.Example.com/a/?utm_source=x&b=2'), 'https://example.com/a?b=2');
});

test('echo roots are deduplicated', () => {
  assert.deepEqual(uniqueCanonicalUrls(['https://example.com/x?utm_source=a','https://www.example.com/x']), ['https://example.com/x']);
});

test('territory rotation is deterministic', () => {
  const a = territoriesForDate(new Date('2026-09-22T00:00:00Z'), 2);
  const b = territoriesForDate(new Date('2026-09-22T23:59:00Z'), 2);
  assert.deepEqual(a,b);
});

test('sensor prompt forbids personal identifiers', () => {
  assert.match(buildSensorPrompt({query:'work'}), /Do not collect names/i);
});

test('PII-looking contact details are redacted', () => {
  const s=privacySafeText('mail a@b.com or +351 912 345 678');
  assert.ok(!s.includes('a@b.com'));
  assert.ok(!s.includes('912 345 678'));
});
