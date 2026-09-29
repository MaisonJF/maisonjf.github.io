import test from 'node:test';
import assert from 'node:assert/strict';
import { routeOceanContext, OCEAN_CONTEXT_RULE_COUNT } from '../src/ocean_context.js';

test('live intelligence maps a strong human signal to an existing canonical Ocean',()=>{
  const route=routeOceanContext({
    text:'People describe revenge bedtime procrastination as the only me time at night after obligations.',
    territoryKey:'media_pulse',
    providerId:'osiris_live_news',
    citations:['https://example.org/a','https://example.org/b']
  });
  assert.equal(route.oceanKey,'adiar-o-sono-para-recuperar-autonomia');
  assert.equal(route.canonicalOceanId,route.oceanKey);
  assert.equal(route.kind,'enrichment');
  assert.ok(route.relevanceScore>=70);
  assert.equal(route.evidenceRoots.length,2);
});

test('irrelevant infrastructure snapshots do not create fake human Oceans',()=>{
  const route=routeOceanContext({
    text:'AIS vessel positions and port coordinates updated.',
    territoryKey:'mobility_maritime',
    providerId:'osiris_maritime',
    citations:['https://example.org/maritime']
  });
  assert.equal(route,null);
});

test('commercially useful Maison discovery signals route without an AI call',()=>{
  const route=routeOceanContext({
    text:'Organic discovery and search visibility changed for branded queries and AI search.',
    territoryKey:'search_visibility',
    providerId:'google_search_console',
    citations:['https://search.google.com/search-console']
  });
  assert.equal(route.oceanKey,'descoberta-organica-e-reconhecimento-da-maison');
  assert.ok(route.commercialScore>=80);
});

test('context catalogue covers the current canonical human Ocean set',()=>{
  assert.ok(OCEAN_CONTEXT_RULE_COUNT>=20);
});
