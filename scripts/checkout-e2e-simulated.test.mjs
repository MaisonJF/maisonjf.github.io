import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {onRequestPost as stripeWebhook} from '../functions/api/stripe-webhook-live.js';
import {onRequestPost as receiptLive} from '../functions/api/checkout-receipt-live.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import assert from 'node:assert/strict';
import {onRequest as maintenanceGateway} from '../functions/_middleware.js';
import {onRequestPost as checkoutTest} from '../functions/api/create-checkout-test.js';
import {onRequestGet as confirmTest} from '../functions/api/checkout-session-test.js';
import {onRequestPost as checkoutEbook} from '../functions/api/create-checkout-live.js';
import {onRequestGet as confirmEbook} from '../functions/api/checkout-session-live.js';
import {onRequestGet as downloadEbook} from '../functions/api/ebook-download-live.js';
import {onRequestPost as checkoutProduct} from '../functions/api/create-product-checkout-live.js';
import {onRequestGet as confirmProduct} from '../functions/api/product-checkout-session-live.js';
import {onRequestPost as checkoutPdi} from '../functions/api/create-pdi-checkout-live.js';

const BASE='https://maison-jf.com';
const request=(path,method='GET',body)=>new Request(BASE+path,{
  method,headers:body===undefined?{}:{'content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
});
const jsonResponse=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json'}
});
const testSession={
 id:'cs_test_fixture123',livemode:false,status:'complete',payment_status:'paid',
 amount_total:299,currency:'eur',created:Math.floor(Date.now()/1000),
 customer_details:{email:'test@example.invalid',name:'Test Buyer'},
 metadata:{environment:'maison-jf-sandbox',source:'site-cart-test',ebook_ids:'turista',has_physical:'0'}
};
const ebookSession={
 id:'cs_live_fixture123',livemode:true,status:'complete',payment_status:'paid',
 amount_total:299,currency:'eur',created:Math.floor(Date.now()/1000),
 customer_details:{email:'test@example.invalid',name:'Test Buyer'},
 metadata:{environment:'maison-jf-live',source:'ebooks-live',ebook_ids:'turista',ebook_locale:'pt-PT',expected_amount_total:'299',has_physical:'0'}
};
const physicalSession={
 id:'cs_live_product123',livemode:true,status:'complete',payment_status:'paid',
 amount_total:1990,currency:'eur',created:Math.floor(Date.now()/1000),
 metadata:{environment:'maison-jf-live',source:'physical-product-live',product_items:'vela-vidro:1',
 shipping_zone:'mainland',shipping_cents:'590'}
};
async function withStripeMock(session,callback,{capture=null}={}){
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{
   const target=String(url);
   if(!target.startsWith('https://api.stripe.com/'))throw Error('Unexpected outgoing request: '+target);
   if(capture)capture.push({url:target,method:options.method||'GET',body:String(options.body||'')});
   if(target.endsWith('/v1/checkout/sessions')&&options.method==='POST'){
     return jsonResponse({id:session.id,livemode:session.livemode,url:'https://checkout.stripe.com/c/pay/'+session.id});
   }
   if(target.includes('/v1/checkout/sessions/')&&(!options.method||options.method==='GET'))return jsonResponse(session);
   throw Error('Unexpected Stripe API call: '+target);
 };
 try{return await callback()}finally{globalThis.fetch=previous}
}
test('test mode: cart → Stripe checkout → paid session confirmation, no external calls',async()=>{
 const calls=[];
 await withStripeMock(testSession,async()=>{
   const created=await checkoutTest({request:request('/api/create-checkout-test','POST',{items:[{id:'turista',quantity:1}]}),env:{STRIPE_SECRET_KEY:'sk_test_fixture'}});
   assert.equal(created.status,200);
   assert.match((await created.json()).url,/^https:\/\/checkout\.stripe\.com/);
   const verified=await confirmTest({request:request('/api/checkout-session-test?session_id=cs_test_fixture123'),env:{STRIPE_SECRET_KEY:'sk_test_fixture'}});
   assert.equal(verified.status,200);
   const result=await verified.json();
   assert.equal(result.payment_status,'paid');
   assert.deepEqual(result.ebook_ids,['turista']);
   assert.equal(result.environment,'test');
 },{capture:calls});
 const payload=new URLSearchParams(calls[0].body);
 assert.equal(payload.get('metadata[environment]'),'maison-jf-sandbox');
 assert.equal(payload.get('metadata[ebook_ids]'),'turista');
 assert.equal(payload.get('line_items[0][price_data][currency]'),'eur');
 assert.equal(payload.get('line_items[0][price_data][unit_amount]'),'299');
 assert.equal(payload.get('line_items[0][price]'),null);
 assert.equal(payload.get('success_url'),BASE+'/checkout-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
});
test('test mode: rejects live keys and unpaid ebook entitlement',async()=>{
 let response=await checkoutTest({request:request('/api/create-checkout-test','POST',{items:[{id:'turista',quantity:1}]}),env:{STRIPE_SECRET_KEY:'sk_live_do_not_use'}});
 assert.equal(response.status,503);
 await withStripeMock({...testSession,payment_status:'unpaid'},async()=>{
   response=await confirmTest({request:request('/api/checkout-session-test?session_id=cs_test_fixture123'),env:{STRIPE_SECRET_KEY:'sk_test_fixture'}});
   assert.equal(response.status,200);
   assert.deepEqual((await response.json()).ebook_ids,[]);
 });
});
test('live ebook handlers (offline mock only): checkout → confirmed purchase → private PDF',async()=>{
 const calls=[];
 await withStripeMock(ebookSession,async()=>{
   const created=await checkoutEbook({request:request('/api/create-checkout-live','POST',{items:[{id:'turista',quantity:1}],locale:'pt-PT'}),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(created.status,200);
   assert.ok((await created.json()).url);
   const confirmed=await confirmEbook({request:request('/api/checkout-session-live?session_id=cs_live_fixture123'),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(confirmed.status,200);
   assert.deepEqual((await confirmed.json()).ebook_ids,['turista']);
   const storage={get:async key=>({body:new Uint8Array([37,80,68,70]),writeHttpMetadata(){}})};
   const download=await downloadEbook({request:request('/api/ebook-download-live?session_id=cs_live_fixture123&ebook=turista&format=pdf'),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only',EBOOKS:storage}});
   assert.equal(download.status,200);
   assert.match(download.headers.get('content-disposition'),/O-Turista\.pdf/);
 },{capture:calls});
 assert.equal(new URLSearchParams(calls[0].body).get('metadata[source]'),'ebooks-live');
});
test('live ebook handlers deny unpaid, forged item and expired access',async()=>{
 const storage={get:async()=>{throw Error('Storage must not be reached')}};
 for(const [session,query,status] of [
   [{...ebookSession,payment_status:'unpaid'},'ebook=turista',403],
   [ebookSession,'ebook=meandros',403],
   [{...ebookSession,created:Math.floor(Date.now()/1000)-8*86400},'ebook=turista',410],
   [{...ebookSession,livemode:false},'ebook=turista',403]
 ]){
   await withStripeMock(session,async()=>{
     const r=await downloadEbook({request:request('/api/ebook-download-live?session_id=cs_live_fixture123&format=pdf&'+query),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only',EBOOKS:storage}});
     assert.equal(r.status,status);
   });
 }
});
test('live physical flow (offline mock only): cart → Stripe → purchase confirmation',async()=>{
 const captured=[];
 await withStripeMock(physicalSession,async()=>{
   const created=await checkoutProduct({request:request('/api/create-product-checkout-live','POST',{items:[{slug:'vela-vidro',quantity:1}],shipping_zone:'mainland',shipping_postal_code:'4000-123'}),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(created.status,200);
   const data=await created.json();
   assert.equal(data.shipping_cents,590);
   const confirmed=await confirmProduct({request:request('/api/product-checkout-session-live?session_id=cs_live_product123'),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(confirmed.status,200);
   assert.equal((await confirmed.json()).payment_status,'paid');
 },{capture:captured});
 const payload=new URLSearchParams(captured[0].body);
 assert.equal(payload.get('metadata[product_items]'),'vela-vidro:1');
 assert.equal(payload.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'590');
});
test('live physical: invalid shipping region rejected before contacting Stripe',async()=>{
 const created=await checkoutProduct({request:request('/api/create-product-checkout-live','POST',{items:[{slug:'vela-vidro',quantity:1}],shipping_zone:'islands',shipping_postal_code:'4000-123'}),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
 assert.equal(created.status,400);
});
test('paid game endpoint refuses missing live key; no charges in test suite',async()=>{
 const r=await checkoutPdi({request:request('/api/create-pdi-checkout-live','POST',{mode:'duo'}),env:{}});
 assert.equal(r.status,503);
});

test('Stripe mock with wrong mode must not redirect buyer',async()=>{
 await withStripeMock({...testSession,livemode:true},async()=>{
   const r=await checkoutTest({request:request('/api/create-checkout-test','POST',{items:[{id:'turista',quantity:1}]}),env:{STRIPE_SECRET_KEY:'sk_test_fixture'}});
   assert.equal(r.status,502);
 });
 await withStripeMock({...physicalSession,livemode:false},async()=>{
   const r=await checkoutProduct({request:request('/api/create-product-checkout-live','POST',{items:[{slug:'vela-vidro',quantity:1}],shipping_zone:'mainland',shipping_postal_code:'4000-123'}),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(r.status,502);
 });
});
test('live receipt: paid session records receipt email via mocked Stripe only',async()=>{
 const previous=globalThis.fetch;
 let receiptWrites=0;
 try{
   globalThis.fetch=async(url,options={})=>{
     const u=String(url);
     if(u.endsWith('/v1/checkout/sessions/cs_live_fixture123'))return jsonResponse({...ebookSession,payment_intent:'pi_mock123'});
     if(u.endsWith('/v1/payment_intents/pi_mock123')&&options.method==='POST'){
       const payload=new URLSearchParams(String(options.body));
       assert.equal(payload.get('receipt_email'),'test@example.invalid');
       receiptWrites++;
       return jsonResponse({receipt_email:'test@example.invalid'});
     }
     if(u.endsWith('/v1/payment_intents/pi_mock123'))return jsonResponse({receipt_email:null});
     throw Error('Unexpected outgoing URL '+u);
   };
   const response=await receiptLive({request:request('/api/checkout-receipt-live','POST',{session_id:'cs_live_fixture123'}),env:{STRIPE_LIVE_SECRET_KEY:'sk_live_mock_only'}});
   assert.equal(response.status,200);
   assert.equal((await response.json()).status,'receipt_email_set');
   assert.equal(receiptWrites,1);
 }finally{globalThis.fetch=previous}
});
test('live signed webhook records paid purchases once and rejects invalid signature',async()=>{
 let recorded=0;
 let wasRecorded=false;
 const db={prepare(sql){
   return {bind(){return {
     first:async()=>wasRecorded?{event_id:'evt_mock'}:null,
     run:async()=>{recorded++;wasRecorded=true;return {success:true}}
   }}};
 }};
 const timestamp=String(Math.floor(Date.now()/1000));
 const event={id:'evt_stripe_mock',type:'checkout.session.completed',data:{object:ebookSession}};
 const payload=JSON.stringify(event);
 const secret='whsec_mock_only';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+payload));
 const signature=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const req=(sig)=>new Request(BASE+'/api/stripe-webhook-live',{method:'POST',headers:{'content-type':'application/json','stripe-signature':sig},body:payload});
 const env={STRIPE_LIVE_WEBHOOK_SECRET:secret,MAISON_BRAIN_DB:db};
 const rejected=await stripeWebhook({request:req('t='+timestamp+',v1=invalid'),env});
 assert.equal(rejected.status,400);
 assert.equal(recorded,0);
 const signed='t='+timestamp+',v1='+signature;
 const accepted=await stripeWebhook({request:req(signed),env});
 assert.equal(accepted.status,200);
 const repeated=await stripeWebhook({request:req(signed),env});
 assert.equal(repeated.status,200);
 assert.equal(recorded,1);
});


test('maintenance allows Stripe sandbox only on explicit Cloudflare preview with test key',async()=>{
 const fixtureEnv={STRIPE_SECRET_KEY:'sk_test_mock_only',MAISON_SANDBOX_ENABLED:'1'};
 const context=(host,path,method,env)=>({
   request:new Request('https://'+host+path,{method}),
   env,
   next:async()=>new Response('sandbox fixture: allowed',{status:200,headers:{'content-type':'text/plain'}})
 });
 const preview='maison-3-0.maisonjf-github-io.pages.dev';
 for(const [host,path,method,env,status] of [
   [preview,'/checkout-teste','GET',fixtureEnv,200],
   [preview,'/checkout-teste/','GET',fixtureEnv,200],
   [preview,'/checkout-teste.html','GET',fixtureEnv,200],
   [preview,'/checkout-sucesso','GET',fixtureEnv,200],
   [preview,'/checkout-sucesso/','GET',fixtureEnv,200],
   [preview,'/checkout-sucesso.html','GET',fixtureEnv,200],
   [preview,'/api/create-checkout-test','POST',fixtureEnv,200],
   [preview,'/api/checkout-session-test','GET',fixtureEnv,200],
   // Commercial domains must never expose any Stripe sandbox endpoints.
   ['maison-jf.com','/api/create-checkout-test','POST',fixtureEnv,404],
   ['maison-jf.com','/checkout-teste.html','GET',fixtureEnv,404],
   ['maison-jf.com','/checkout-teste','GET',fixtureEnv,404],
   ['maison-jf.com','/checkout-sucesso','GET',fixtureEnv,404],
   ['www.maison-jf.com','/checkout-teste.html','GET',fixtureEnv,404],
   // Commercial domain is open after launch.
   ['maison-jf.com','/','GET',{},200],
   ['maison-jf.com','/produtos/','GET',{},200],
   ['maison-jf.com','/api/create-checkout-live','POST',{},200],
   ['www.maison-jf.com','/ebooks/','GET',{},200],
   // Production can be rolled back without editing source code.
   ['maison-jf.com','/','GET',{MAISON_SITE_MAINTENANCE:'1'},503],
   ['maison-jf.com','/api/create-checkout-live','POST',{MAISON_SITE_MAINTENANCE:'1'},503],
   [preview,'/api/create-product-checkout-live','POST',fixtureEnv,503],
   [preview,'/api/create-checkout-test','GET',fixtureEnv,503],
   [preview,'/api/create-checkout-test','POST',{...fixtureEnv,MAISON_SANDBOX_ENABLED:'0'},503],
   [preview,'/api/create-checkout-test','POST',{...fixtureEnv,STRIPE_SECRET_KEY:'sk_live_wrong'},503],
   ['evil.pages.dev','/api/create-checkout-test','POST',fixtureEnv,503]
 ]){
   const response=await maintenanceGateway(context(host,path,method,env));
   assert.equal(response.status,status,host+path+' '+method);
   if(status===200 && host===preview)assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
 }
});
