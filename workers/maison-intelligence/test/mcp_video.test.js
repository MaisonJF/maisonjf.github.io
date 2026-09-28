import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMaisonMcpRequest } from '../src/mcp_video.js';

function post(method,params,id=1){
  return new Request('https://maison.example/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
}

test('MCP initializes with tools capability',async()=>{
  const r=await handleMaisonMcpRequest(post('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}),{});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.result.serverInfo.name,'maison-jf');
  assert.equal(body.result.protocolVersion,'2025-06-18');
  assert.deepEqual(body.result.capabilities,{tools:{listChanged:false}});
});

test('MCP exposes only the three bounded video tools',async()=>{
  const r=await handleMaisonMcpRequest(post('tools/list',{}),{});
  const body=await r.json();
  assert.deepEqual(body.result.tools.map(x=>x.name),[
    'maison_video_health','maison_generate_video','maison_video_result'
  ]);
  const generate=body.result.tools.find(x=>x.name==='maison_generate_video');
  assert.equal(generate.annotations.destructiveHint,false);
  assert.equal(generate.inputSchema.properties.duration_seconds.maximum,3);
  assert.equal(generate.inputSchema.properties.steps.maximum,4);
  assert.equal(generate.securitySchemes[0].type,'oauth2');
});

test('non-MCP paths fall through',async()=>{
  const r=await handleMaisonMcpRequest(new Request('https://maison.example/internal/video/health'),{});
  assert.equal(r,null);
});


test('protected resource metadata points to Supabase OAuth issuer',async()=>{
  const r=await handleMaisonMcpRequest(new Request('https://mcp.maison-jf.com/.well-known/oauth-protected-resource'),{MAISON_MCP_CONFIG:JSON.stringify({supabase_url:'https://example.supabase.co'})});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.resource,'https://mcp.maison-jf.com/mcp');
  assert.deepEqual(body.authorization_servers,['https://example.supabase.co/auth/v1']);
});


test('compact MCP config fails closed when malformed',async()=>{
  const r=await handleMaisonMcpRequest(new Request('https://mcp.maison-jf.com/.well-known/oauth-protected-resource'),{MAISON_MCP_CONFIG:'{bad'});
  assert.equal(r.status,503);
});
