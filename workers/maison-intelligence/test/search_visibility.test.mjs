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
  assert.equal(tasks.length,10);
  const analytics=tasks.filter(x=>x.family==='google_search_console');
  const finalized=analytics.filter(x=>x.key!=='fresh_pages');
  const fresh=analytics.find(x=>x.key==='fresh_pages');
  const inspection=tasks.find(x=>x.family==='google_url_inspection');
  const sitemaps=tasks.find(x=>x.family==='google_sitemaps');
  assert.deepEqual(analytics.map(x=>x.key),['pages','queries','devices','countries','appearance','fresh_pages','image_pages','discover_pages']);
  assert.ok(tasks.every(x=>x.providerId==='google_search_console'));
  assert.ok(tasks.every(x=>x.territoryKey==='search_visibility'));
  assert.ok(finalized.every(x=>x.days===28&&x.lagDays===3));
  assert.ok(analytics.every(x=>x.rowLimit<=40));
  assert.equal(fresh.days,3);
  assert.equal(fresh.lagDays,0);
  assert.equal(fresh.dataState,'all');
  assert.deepEqual(fresh.dimensions,['date','page']);
  assert.equal(analytics.find(x=>x.key==='image_pages').type,'image');
  assert.equal(analytics.find(x=>x.key==='discover_pages').type,'discover');
  assert.equal(inspection.key,'inspection');
  assert.equal(inspection.inspectionUrls.length,6);
  assert.equal(sitemaps.key,'sitemaps');
  assert.equal(sitemaps.cadenceHours,24);
  assert.ok(inspection.inspectionUrls.every(url=>url.startsWith('https://maison-jf.com/')));
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
    assert.equal(payload.start_date,'2026-08-25');
    assert.equal(payload.end_date,'2026-09-21');
    assert.equal(payload.data_state,'final');
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


test('URL Inspection rotates one canonical Maison URL and returns index coverage facts',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('oauth2.googleapis.com/token')){
      return new Response(JSON.stringify({access_token:'inspection-access'}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({
      inspectionResult:{
        indexStatusResult:{
          verdict:'PASS',
          coverageState:'Submitted and indexed',
          robotsTxtState:'ALLOWED',
          indexingState:'INDEXING_ALLOWED',
          lastCrawlTime:'2026-09-24T09:10:11Z',
          pageFetchState:'SUCCESSFUL',
          googleCanonical:'https://maison-jf.com/servicos/tarot/',
          userCanonical:'https://maison-jf.com/servicos/tarot/',
          crawledAs:'DESKTOP',
          sitemap:['https://maison-jf.com/sitemap.xml']
        }
      }
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const task=configuredSearchVisibilityTasks({
      SEARCH_VISIBILITY_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com',
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret',
      GOOGLE_SEARCH_CONSOLE_INSPECTION_URLS:'https://maison-jf.com/servicos/tarot/'
    }).find(x=>x.family==='google_url_inspection');

    const result=await fetchSearchVisibility({
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret'
    },task,new Date('2026-09-25T00:00:00Z'));

    assert.equal(calls.length,2);
    assert.ok(calls[1].url.includes('urlInspection/index:inspect'));
    const request=JSON.parse(calls[1].options.body);
    assert.equal(request.inspectionUrl,'https://maison-jf.com/servicos/tarot/');
    assert.equal(request.siteUrl,'sc-domain:maison-jf.com');
    const payload=JSON.parse(result.text);
    assert.equal(payload.schema,'maison.search-visibility.gsc-inspection.v1');
    assert.equal(payload.verdict,'PASS');
    assert.equal(payload.robots_txt_state,'ALLOWED');
    assert.equal(payload.indexing_state,'INDEXING_ALLOWED');
    assert.equal(payload.google_canonical,payload.user_canonical);
    assert.equal(result.strength,100);
    assert.equal(result.evidenceKind,'coverage');
    assert.ok(!JSON.stringify(result).includes('inspection-access'));
  }finally{
    globalThis.fetch=original;
  }
});

test('URL Inspection rejects foreign or insecure target URLs',()=>{
  assert.throws(()=>configuredSearchVisibilityTasks({
    SEARCH_VISIBILITY_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
    GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com',
    GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'id',
    GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'secret',
    GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh',
    GOOGLE_SEARCH_CONSOLE_INSPECTION_URLS:'https://example.com/not-maison'
  }),/gsc_invalid_inspection_url/);
});


test('Search Console sitemap sensor keeps supported lifecycle facts and ignores deprecated indexed counts',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('oauth2.googleapis.com/token')){
      return new Response(JSON.stringify({access_token:'sitemap-access'}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({
      sitemap:[{
        path:'https://maison-jf.com/sitemap.xml',
        lastSubmitted:'2026-09-09T16:23:09.186Z',
        lastDownloaded:'2026-09-25T10:53:20.593Z',
        isPending:false,
        isSitemapsIndex:true,
        type:'sitemapIndex',
        warnings:'0',
        errors:'0',
        contents:[{
          type:'web',
          submitted:'151',
          indexed:'999'
        }]
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
    }).find(x=>x.family==='google_sitemaps');

    const result=await fetchSearchVisibility({
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret'
    },task,new Date('2026-09-25T00:00:00Z'));

    assert.equal(calls.length,2);
    assert.ok(calls[1].url.includes('/sitemaps'));
    assert.equal(calls[1].options.headers.Authorization,'Bearer sitemap-access');
    const payload=JSON.parse(result.text);
    assert.equal(payload.schema,'maison.search-visibility.gsc-sitemaps.v1');
    assert.equal(payload.sitemap_count,1);
    assert.equal(payload.sitemaps[0].warnings,0);
    assert.equal(payload.sitemaps[0].errors,0);
    assert.equal(payload.sitemaps[0].contents[0].submitted,151);
    assert.equal('indexed' in payload.sitemaps[0].contents[0],false);
    assert.equal(JSON.stringify(payload).includes('"indexed"'),false);
    assert.equal(result.evidenceSource,'gsc');
    assert.equal(result.evidenceKind,'coverage');
    assert.ok(!JSON.stringify(result).includes('sitemap-access'));
  }finally{
    globalThis.fetch=original;
  }
});


test('fresh Search Console profile uses Pacific dates and preserves incomplete-data metadata',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('oauth2.googleapis.com/token')){
      return new Response(JSON.stringify({access_token:'fresh-access'}),{status:200,headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({
      rows:[{
        keys:['2026-09-24','https://maison-jf.com/'],
        clicks:1,impressions:4,ctr:.25,position:1.5
      }],
      metadata:{first_incomplete_date:'2026-09-24'}
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
    }).find(x=>x.key==='fresh_pages');

    const result=await fetchSearchVisibility({
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'client-id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'client-secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh-secret'
    },task,new Date('2026-09-25T04:17:00Z'));

    const request=JSON.parse(calls[1].options.body);
    assert.equal(request.startDate,'2026-09-22');
    assert.equal(request.endDate,'2026-09-24');
    assert.equal(request.dataState,'all');
    const payload=JSON.parse(result.text);
    assert.equal(payload.data_state,'all');
    assert.equal(payload.first_incomplete_date,'2026-09-24');
    assert.equal(payload.start_date,'2026-09-22');
    assert.equal(payload.end_date,'2026-09-24');
  }finally{
    globalThis.fetch=original;
  }
});


test('Image and Discover Search Console profiles send their own search type',async()=>{
  const original=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(url,options={})=>{
    if(String(url).includes('oauth2.googleapis.com/token')){
      return new Response(JSON.stringify({access_token:'type-access'}),{status:200,headers:{'content-type':'application/json'}});
    }
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify({rows:[]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const env={
      SEARCH_VISIBILITY_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_ENABLED:'true',
      GOOGLE_SEARCH_CONSOLE_PROPERTY:'sc-domain:maison-jf.com',
      GOOGLE_SEARCH_CONSOLE_CLIENT_ID:'id',
      GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET:'secret',
      GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN:'refresh'
    };
    const tasks=configuredSearchVisibilityTasks(env);
    for(const key of ['image_pages','discover_pages']){
      await fetchSearchVisibility(env,tasks.find(x=>x.key===key),new Date('2026-09-28T12:00:00Z'));
    }
    assert.equal(requests[0].type,'image');
    assert.equal(requests[0].dataState,'final');
    assert.equal(requests[1].type,'discover');
    assert.equal(requests[1].dataState,'final');
  }finally{
    globalThis.fetch=original;
  }
});
