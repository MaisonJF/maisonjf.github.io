#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SiteTelemetryError,
  normalizeSiteTelemetry,
  forwardSiteTelemetry
} from '../../../functions/_lib/site-telemetry.js';
import { onRequestPost } from '../../../functions/api/site-event.js';

const root=new URL('../../../',import.meta.url);
const analytics=fs.readFileSync(new URL('analytics.js',root),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('.github/maison-growth/a2/source-registry.json',root),'utf8'));

const expectedEvents=['page.view','cta.click','navigation.click','offer.exposure','offer.click'];
const site=registry.sources.site;
assert.ok(site);
for(const event of expectedEvents)assert.ok(site.events[event],event);
assert.ok(site.allowed_event_prefixes.includes('offer.'));
assert.equal(JSON.stringify(site).includes('link_text'),false);
assert.equal(JSON.stringify(site).includes('free_text'),false);

const page=normalizeSiteTelemetry({
  event_type:'page.view',
  event_key:'12345678-1234-4234-8234-123456789012',
  consent:true,
  metadata:{path:'/produtos/?utm_source=x#top',surface:'produtos',referrer_host:'google.com'}
});
assert.equal(page.metadata.path,'/produtos/');
assert.equal(page.metadata.surface,'produtos');

assert.throws(()=>normalizeSiteTelemetry({
  event_type:'cta.click',
  event_key:'12345678-1234-4234-8234-123456789012',
  consent:true,
  metadata:{path:'/',cta_id:'person@example.com'}
}),error=>error instanceof SiteTelemetryError);

assert.throws(()=>normalizeSiteTelemetry({
  event_type:'navigation.click',
  event_key:'12345678-1234-4234-8234-123456789012',
  consent:true,
  metadata:{path:'/',navigation_id:'header:produtos',target_path:'/produtos/',link_text:'Produtos'}
}),error=>error instanceof SiteTelemetryError&&error.code==='metadata_not_allowed');

assert.throws(()=>normalizeSiteTelemetry({
  event_type:'page.view',
  event_key:'12345678-1234-4234-8234-123456789012',
  consent:false,
  metadata:{path:'/'}
}),error=>error instanceof SiteTelemetryError&&error.code==='analytics_consent_required');

assert.deepEqual(
  await forwardSiteTelemetry({},page,async()=>{throw new Error('must not fetch')}),
  {status:'ignored',reason:'a2_unconfigured'}
);

let forwarded=null;
const forwardedResult=await forwardSiteTelemetry({
  A2_INGEST_URL:'https://brain.example/internal/a2/ingest',
  A2_INGEST_TOKEN:'server-secret',
  A2_CF_ACCESS_CLIENT_ID:'access-id',
  A2_CF_ACCESS_CLIENT_SECRET:'access-secret'
},page,async(url,options)=>{
  forwarded={url,options,body:JSON.parse(options.body)};
  return new Response('{"status":"accepted"}',{status:200,headers:{'content-type':'application/json'}});
});
assert.equal(forwardedResult.status,'forwarded');
assert.equal(forwarded.body.source,'site');
assert.equal(forwarded.body.event_type,'page.view');
assert.equal(forwarded.body.privacy_class,'anonymous');
assert.equal(forwarded.options.headers.authorization,'Bearer server-secret');
assert.equal(forwarded.options.headers['CF-Access-Client-Id'],'access-id');
assert.equal(JSON.stringify(forwarded.body).includes('server-secret'),false);

const crossOrigin=await onRequestPost({
  request:new Request('https://maison-jf.com/api/site-event',{
    method:'POST',
    headers:{'content-type':'application/json','origin':'https://evil.example'},
    body:JSON.stringify({
      event_type:'page.view',
      event_key:'12345678-1234-4234-8234-123456789012',
      consent:true,
      metadata:{path:'/'}
    })
  }),
  env:{}
});
assert.equal(crossOrigin.status,403);

for(const event of expectedEvents){
  assert.ok(analytics.includes(`trackGrowth('${event}'`),event+' producer missing');
}
assert.ok(analytics.includes("localStorage.getItem(CONSENT_KEY) !== 'granted'"));
assert.ok(analytics.includes("fetch('/api/site-event'"));
assert.equal(/trackGrowth\([^\n]*link_text/.test(analytics),false);
assert.equal(analytics.includes('A2_INGEST_TOKEN'),false);

console.log('Site telemetry -> canonical A2: OK');
