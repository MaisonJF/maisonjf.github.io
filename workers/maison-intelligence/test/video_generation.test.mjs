import test from 'node:test';
import assert from 'node:assert/strict';
import { handleVideoGenerationRequest } from '../src/video_generation.js';

const env={VIDEO_GENERATION_ENABLED:'true',VIDEO_GENERATION_TOKEN:'video-secret'};
const req=(path,body,method='POST')=>new Request('https://worker.example'+path,{method,headers:{'X-Maison-Video-Token':'video-secret','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});

test('health declares a hard zero-cost boundary',async()=>{
 const r=await handleVideoGenerationRequest(req('/internal/video/health',null,'GET'),env);
 const b=await r.json(); assert.equal(b.mode,'zero_cost_only'); assert.equal(b.billing_allowed,false); assert.equal(b.authenticated_hf_usage,false); assert.equal(b.max_clip_seconds,3);
});
test('video API is fail-closed when disabled',async()=>{
 const r=await handleVideoGenerationRequest(req('/internal/video/health',null,'GET'),{...env,VIDEO_GENERATION_ENABLED:'false'});
 assert.equal(r.status,404);
});
test('provider registry refuses non-Hugging-Face endpoints',async()=>{
 const bad={...env,VIDEO_ZERO_COST_PROVIDERS_JSON:JSON.stringify([{id:'paid',base:'https://example.com',api:'generate'}])};
 const r=await handleVideoGenerationRequest(req('/internal/video/health',null,'GET'),bad);
 assert.equal(r.status,400); assert.equal((await r.json()).error,'video_provider_must_be_public_hf_space');
});


test('default Wan2.2 provider payload matches the live 9-input Gradio contract',async()=>{
 const originalFetch=globalThis.fetch;
 let captured=null;
 let target='';
 globalThis.fetch=async(url,init)=>{
   target=String(url);
   captured=JSON.parse(init.body);
   return new Response(JSON.stringify({event_id:'abcdef123456'}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
   const r=await handleVideoGenerationRequest(req('/internal/video/generate',{
     image_url:'https://maison-jf.com/images/ebooks/posters/casos-cinzentos.webp',
     prompt:'Subtle cinematic noir motion',
     duration_seconds:1,
     steps:4,
     seed:42,
     randomize_seed:false
   }),env);
   const b=await r.json();
   assert.equal(r.status,202);
   assert.equal(b.provider,'wan22-aoti-fast');
   assert.match(target,/zerogpu-aoti-wan2-2-fp8da-aoti-faster\.hf\.space\/gradio_api\/call\/generate_video$/);
   assert.equal(captured.data.length,9);
   assert.equal(captured.data[1],'Subtle cinematic noir motion');
   assert.equal(captured.data[2],4);
   assert.equal(captured.data[4],1);
   assert.equal(captured.data[5],1);
   assert.equal(captured.data[6],1);
   assert.equal(captured.data[7],42);
   assert.equal(captured.data[8],false);
 } finally {
   globalThis.fetch=originalFetch;
 }
});

test('health exposes two zero-cost Wan2.2 providers for submission fallback',async()=>{
 const r=await handleVideoGenerationRequest(req('/internal/video/health',null,'GET'),env);
 const b=await r.json();
 assert.deepEqual(b.providers,['wan22-aoti-fast','wan22-r3gm-preview']);
});
