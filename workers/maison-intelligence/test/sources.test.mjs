import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredOsirisSources, PASSIVE_OSIRIS_KEYS, sourceDefinition, osirisSourceCadenceHours, osirisSourceDue } from '../src/sources.js';

test('OSIRIS is disabled by default', () => {
  assert.deepEqual(configuredOsirisSources({}), []);
});

test('full passive OSIRIS profile includes the major world-sensing domains', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true'});
  for (const key of [
    'stats','flights','satellites','space_weather',
    'earthquakes','fires','weather','air_quality','radar',
    'conflicts','gdelt','news','markets','scm_suppliers',
    'cctv','infrastructure','maritime','cyber_threats','malware'
  ]) assert.ok(keys.includes(key), `missing passive source: ${key}`);
  assert.equal(keys.length, PASSIVE_OSIRIS_KEYS.length);
  assert.ok(keys.length >= 20);
});

test('OSIRIS source set can still be narrowed explicitly', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true',OSIRIS_SOURCE_KEYS:'stats,cctv'});
  assert.deepEqual(keys,['stats','cctv']);
});

test('unknown or active routes cannot enter the passive source registry', () => {
  const keys=configuredOsirisSources({OSIRIS_ENABLED:'true',OSIRIS_SOURCE_KEYS:'scanner,recon,osint_sweep,earthquakes'});
  assert.deepEqual(keys,['earthquakes']);
  assert.equal(sourceDefinition('scanner'),null);
  assert.equal(sourceDefinition('osint_sweep'),null);
});


test('source cadences are explicit, bounded and overridable', () => {
  assert.equal(osirisSourceCadenceHours({},'news'),3);
  assert.equal(osirisSourceCadenceHours({},'country_risk'),24);
  assert.equal(osirisSourceCadenceHours({OSIRIS_SOURCE_CADENCES_JSON:'{"news":12}'},'news'),12);
  assert.throws(() => osirisSourceCadenceHours({OSIRIS_SOURCE_CADENCES_JSON:'{"news":0}'},'news'));
});

test('source due calculation is deterministic', () => {
  const at=new Date('2026-09-24T00:00:00Z');
  assert.equal(osirisSourceDue({},'news',at),true);
  assert.equal(osirisSourceDue({},'country_risk',at),true);
  assert.equal(osirisSourceDue({},'news',new Date('2026-09-24T01:00:00Z')),false);
});
