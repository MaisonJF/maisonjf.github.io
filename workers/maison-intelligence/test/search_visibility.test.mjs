import test from 'node:test';
import assert from 'node:assert/strict';

import {
  configuredSearchVisibilityTasks,
  fetchSearchVisibility,
  searchVisibilityDue,
  searchVisibilityTaskIdentity
} from '../src/search_visibility.js';

test('Search Console collection is opt-in and secret-gated',()=>{
  assert.deepEqual(configuredSearchVisibilityTasks({}),[]);
  assert.deepEqual(configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com'
  }),[]);
});

test('configured Search Console exposes bounded read-only profiles',()=>{
  const tasks=configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com',
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'id',
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'secret',
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh'
  });
  assert.equal(tasks.length,5);
  assert.deepEqual(tasks.map(x=>x.key),['pages','queries','devices','countries','appearance']);
  assert.ok(tasks.every(x=>x.providerId==='google_search_console'));
  assert.ok(tasks.every(x=>x.territoryKey==='search_visibility'));
  assert.ok(tasks.every(x=>x.days===28&&x.lagDays===3));
  assert.ok(tasks.every(x=>x.rowLimit<=40));
  assert.ok(searchVisibilityTaskIdentity(tasks[0]).includes('sc-domain:maison-jf.com'));
});

test('configured Bing Webmaster adds traffic/pages/query profiles only when OAuth is complete',()=>{
  const tasks=configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_ENABLED:'false',
    BING_WEBMASTER_ENABLED:'true',
    BING_WEBMASTER_SITE_URL:'https://maison-jf.com/',
    BING_WEBMASTER_CLIENT_ID:'id',
    BING_WEBMASTER_CLIENT_SECRET:'secret',
    BING_WEBMASTER_REFRESH_TOKEN:'refresh'
  });
  assert.equal(tasks.length,3);
  assert.deepEqual(tasks.map(x=>x.key),['traffic','pages','queries']);
  assert.deepEqual(tasks.map(x=>x.method),['GetRankAndTrafficStats','GetPageStats','GetQueryStats']);
  assert.ok(tasks.every(x=>x.providerId==='bing_webmaster'));
});

test('invalid Bing site URL is rejected',()=>{
  assert.throws(()=>configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    BING_WEBMASTER_ENABLED:'true',
    BING_WEBMASTER_SITE_URL:'javascript:bad',
    BING_WEBMASTER_CLIENT_ID:'id',
    BING_WEBMASTER_CLIENT_SECRET:'secret',
    BING_WEBMASTER_REFRESH_TOKEN:'refresh'
  }),/bing_invalid_site_url/);
});

test('invalid Search Console property is rejected',()=>{
  assert.throws(()=>configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_PROPERTY:'javascript:bad',
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'id',
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'secret',
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh'
  }),/gsc_invalid_property/);
});

test('daily and weekly Search Console profiles have deterministic cadence',()=>{
  const daily={cadenceHours:24};
  const weekly={cadenceHours:168};
  assert.equal(searchVisibilityDue(daily,new Date('2026-09-28T00:00:00Z')),true);
  assert.equal(searchVisibilityDue(daily,new Date('2026-09-28T01:00:00Z')),false);
  assert.equal(typeof searchVisibilityDue(weekly,new Date('2026-09-28T00:00:00Z')),'boolean');
});

test('Search Console fetch uses OAuth token privately and returns direct coverage evidence',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('oauth2.googleapis.com/token')){
      return new Response(JSON.stringify({access_token:'access-secret'}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({
      rows:[{
        keys:['https://maison-jf.com/'],
        clicks:7,impressions:20,ctr:.35,position:1.5
      }]
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const task=configuredSearchVisibilityTasks({
      SEARCH_VISIBILITY_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com',
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret'
    })[0];
    const result=await fetchSearchVisibility({
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret'
    },task,new Date('2026-09-25T00:00:00Z'));

    assert.equal(calls.length,2);
    assert.equal(calls[1].options.headers.Authorization,'Bearer access-secret');
    assert.ok(!calls[1].url.includes('access-secret'));
    assert.ok(!JSON.stringify(result).includes('client-secret'));
    assert.ok(!JSON.stringify(result).includes('refresh-secret'));
    assert.equal(result.sourceClass,'search_platform');
    assert.equal(result.groundingState,'direct_observation');
    assert.equal(result.evidenceSource,'gsc');
    assert.equal(result.evidenceKind,'coverage');
    assert.equal(result.sourceKind,'search_visibility');
    const payload=JSON.parse(result.text);
    assert.equal(payload.start_date,'2026-08-26');
    assert.equal(payload.end_date,'2026-09-22');
    assert.equal(payload.rows[0].impressions,20);
  }finally{
    globalThis.fetch=original;
  }
});

test('Bing Webmaster fetch uses bearer OAuth privately and returns coverage evidence',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('/webmasters/oauth/token')){
      return new Response(JSON.stringify({access_token:'bing-access-secret'}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({d:[{
      Query:'https://maison-jf.com/',
      Clicks:4,
      Impressions:18,
      AvgClickPosition:2,
      AvgImpressionPosition:3,
      Date:'/Date(1790294400000+0000)/'
    }]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const task=configuredSearchVisibilityTasks({
      SEARCH_VISIBILITY_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_ENABLED:'false',
      BING_WEBMASTER_ENABLED:'true',
      BING_WEBMASTER_SITE_URL:'https://maison-jf.com/',
      BING_WEBMASTER_CLIENT_ID:'bing-client',
      BING_WEBMASTER_CLIENT_SECRET:'bing-secret',
      BING_WEBMASTER_REFRESH_TOKEN:'bing-refresh'
    }).find(x=>x.key==='pages');

    const result=await fetchSearchVisibility({
      BING_WEBMASTER_CLIENT_ID:'bing-client',
      BING_WEBMASTER_CLIENT_SECRET:'bing-secret',
      BING_WEBMASTER_REFRESH_TOKEN:'bing-refresh'
    },task,new Date('2026-09-25T00:00:00Z'));

    assert.equal(calls.length,2);
    assert.equal(calls[1].options.headers.Authorization,'Bearer bing-access-secret');
    assert.ok(calls[1].url.includes('GetPageStats'));
    assert.ok(!calls[1].url.includes('bing-access-secret'));
    assert.ok(!JSON.stringify(result).includes('bing-secret'));
    assert.ok(!JSON.stringify(result).includes('bing-refresh'));
    assert.equal(result.providerId,'bing_webmaster');
    assert.equal(result.sourceClass,'search_platform');
    assert.equal(result.groundingState,'direct_observation');
    assert.equal(result.evidenceKind,'coverage');
    assert.equal(result.evidenceSource,'system');
    const payload=JSON.parse(result.text);
    assert.equal(payload.schema,'maison.search-visibility.bing.v1');
    assert.equal(payload.rows[0].impressions,18);
  }finally{
    globalThis.fetch=original;
  }
});
