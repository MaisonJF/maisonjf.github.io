import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOsirisMemoryEnvelope, osirisMemoryBridgeConfigured } from '../src/memory.js';

test('Osiris Memory bridge is disabled by default', () => {
  assert.equal(osirisMemoryBridgeConfigured({}), false);
});

test('Osiris Memory bridge requires URL and secret token', () => {
  assert.equal(osirisMemoryBridgeConfigured({
    OSIRIS_MEMORY_ENABLED:'true',
    OSIRIS_MEMORY_BRIDGE_URL:'https://memory.example/ingest'
  }), false);
  assert.equal(osirisMemoryBridgeConfigured({
    OSIRIS_MEMORY_ENABLED:'true',
    OSIRIS_MEMORY_BRIDGE_URL:'https://memory.example/ingest',
    OSIRIS_MEMORY_BRIDGE_TOKEN:'secret'
  }), true);
});

test('Memory envelope carries provenance without inventing identity', () => {
  const out=buildOsirisMemoryEnvelope({
    observationId:'obs_test',
    eventId:'evt_test',
    providerId:'osiris_earthquakes',
    modelId:null,
    sourceClass:'public_web',
    territoryKey:'earth_hazards',
    groundingState:'grounded',
    observedAt:'2026-09-23T10:00:00Z',
    confidenceClass:'high',
    citations:['https://earthquake.usgs.gov/'],
    safeText:'aggregate observation'
  });
  assert.equal(out.source,'maison-a13');
  assert.equal(out.independent_evidence_roots,1);
  assert.equal(out.text,'aggregate observation');
  assert.equal('person' in out,false);
});
