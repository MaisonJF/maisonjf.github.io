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
