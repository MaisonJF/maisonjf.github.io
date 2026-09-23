import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredOsirisSources, sourceDefinition } from '../src/sources.js';

test('OSIRIS is disabled by default', () => {
  assert.deepEqual(configuredOsirisSources({}), []);
});

test('default passive OSIRIS allowlist excludes CCTV until explicitly enabled', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true'});
  assert.ok(keys.includes('earthquakes'));
  assert.ok(keys.includes('fires'));
  assert.ok(keys.includes('weather'));
  assert.ok(!keys.includes('cctv'));
});

test('CCTV metadata can be explicitly opted in', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true',OSIRIS_SOURCE_KEYS:'stats,cctv'});
  assert.deepEqual(keys,['stats','cctv']);
});

test('unknown or active routes cannot enter the passive source registry', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true',OSIRIS_SOURCE_KEYS:'scanner,recon,osint_sweep,earthquakes'});
  assert.deepEqual(keys,['earthquakes']);
  assert.equal(sourceDefinition('scanner'),null);
});
