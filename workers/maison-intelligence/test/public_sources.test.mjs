import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configuredPublicSourceTasks,
  fetchPublicSource,
  publicSourceDue,
  publicTaskIdentity
} from '../src/public_sources.js';

test('public data sources are disabled by default', () => {
  assert.deepEqual(configuredPublicSourceTasks({}), []);
});

test('Eurostat profile is explicit and keyless', () => {
  const env={
    PUBLIC_DATA_ENABLED:'true',
    EUROSTAT_ENABLED:'true',
    EUROSTAT_QUERIES_JSON:JSON.stringify([{
      key:'tourism_pt',
      dataset:'demo_dataset',
      territoryKey:'tourism',
      cadenceHours:24,
      params:{geo:'PT'}
    }])
  };
  const tasks=configuredPublicSourceTasks(env);
  assert.equal(tasks.length,1);
  assert.equal(tasks[0].family,'eurostat');
  assert.equal(tasks[0].providerId,'eurostat_tourism_pt');
  assert.equal(publicSourceDue(tasks[0],new Date('2026-09-24T00:00:00Z')),true);
  assert.equal(publicSourceDue(tasks[0],new Date('2026-09-24T01:00:00Z')),false);
  assert.match(publicTaskIdentity(tasks[0]),/demo_dataset/);
});

test('BASE is not configured without authorized token', () => {
  const env={
    PUBLIC_DATA_ENABLED:'true',
    BASE_PT_ENABLED:'true',
    BASE_PT_QUERIES_JSON:JSON.stringify([{
      key:'announcements',
      endpoint:'GetInfoAnuncio',
      territoryKey:'b2b_public_procurement',
      params:{Ano:'2026'}
    }])
  };
  assert.deepEqual(configuredPublicSourceTasks(env),[]);
});

test('OpenAlex is not configured without account API key', () => {
  const env={
    PUBLIC_DATA_ENABLED:'true',
    OPENALEX_ENABLED:'true',
    OPENALEX_QUERIES_JSON:JSON.stringify([{
      key:'ritual_science',
      search:'ritual wellbeing',
      territoryKey:'science_wellbeing'
    }])
  };
  assert.deepEqual(configuredPublicSourceTasks(env),[]);
});

test('BASE endpoint allowlist rejects arbitrary routes', () => {
  assert.throws(() => configuredPublicSourceTasks({
    PUBLIC_DATA_ENABLED:'true',
    BASE_PT_ENABLED:'true',
    BASE_PT_API_TOKEN:'secret',
    BASE_PT_QUERIES_JSON:JSON.stringify([{
      key:'bad',
      endpoint:'AnythingAtAll',
      territoryKey:'b2b',
      params:{Ano:'2026'}
    }])
  }),/endpoint_not_allowed/);
});

test('OpenAlex key stays in Authorization header, never request URL', async () => {
  const env={
    PUBLIC_DATA_ENABLED:'true',
    OPENALEX_ENABLED:'true',
    OPENALEX_API_KEY:'oa-secret-key',
    OPENALEX_QUERIES_JSON:JSON.stringify([{
      key:'science',
      search:'wellbeing rituals',
      territoryKey:'science_wellbeing',
      perPage:10,
      cadenceHours:24
    }])
  };
  const task=configuredPublicSourceTasks(env)[0];
  const original=globalThis.fetch;
  let captured;
  globalThis.fetch=async (url,options) => {
    captured={url:String(url),headers:options.headers};
    return new Response(JSON.stringify({meta:{cost_usd:0.001},results:[]}),{
      status:200,
      headers:{'content-type':'application/json','x-request-id':'req_test'}
    });
  };
  try {
    const result=await fetchPublicSource(env,task);
    assert.ok(!captured.url.includes('oa-secret-key'));
    assert.equal(captured.headers.Authorization,'Bearer oa-secret-key');
    assert.equal(result.usage.total_cost,0.001);
    assert.ok(!result.citations.some(x => x.includes('oa-secret-key')));
  } finally {
    globalThis.fetch=original;
  }
});

test('Eurostat request is official endpoint and provenance retains exact URL', async () => {
  const env={
    PUBLIC_DATA_ENABLED:'true',
    EUROSTAT_ENABLED:'true',
    EUROSTAT_QUERIES_JSON:JSON.stringify([{
      key:'prices',
      dataset:'prc_hicp',
      territoryKey:'consumer_prices',
      params:{geo:'PT'},
      cadenceHours:24
    }])
  };
  const task=configuredPublicSourceTasks(env)[0];
  const original=globalThis.fetch;
  let capturedUrl='';
  globalThis.fetch=async (url) => {
    capturedUrl=String(url);
    return new Response(JSON.stringify({value:[1,2,3]}),{status:200});
  };
  try {
    const result=await fetchPublicSource(env,task);
    assert.match(capturedUrl,/ec\.europa\.eu\/eurostat\/api\/dissemination\/statistics\/1\.0\/data\/prc_hicp/);
    assert.match(capturedUrl,/geo=PT/);
    assert.ok(result.citations.includes(capturedUrl));
  } finally {
    globalThis.fetch=original;
  }
});
