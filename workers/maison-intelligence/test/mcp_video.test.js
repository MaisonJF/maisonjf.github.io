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

test('MCP exposes bounded video, Ocean and private editorial candidate tools',async()=>{
  const r=await handleMaisonMcpRequest(post('tools/list',{}),{});
  const body=await r.json();
  assert.deepEqual(body.result.tools.map(x=>x.name),[
    'maison_video_health','maison_generate_video','maison_ingest_ocean_signal','maison_ingest_vault_candidate',
    'maison_ingest_candidate','maison_list_candidates','maison_video_result'
  ]);
  const generate=body.result.tools.find(x=>x.name==='maison_generate_video');
  assert.equal(generate.annotations.destructiveHint,false);
  assert.equal(generate.inputSchema.properties.duration_seconds.maximum,3);
  assert.equal(generate.inputSchema.properties.steps.maximum,4);
  assert.equal(generate.securitySchemes[0].type,'oauth2');
  const ocean=body.result.tools.find(x=>x.name==='maison_ingest_ocean_signal');
  assert.deepEqual(ocean.inputSchema.required,['ocean_key','source_ref','summary']);
  assert.equal(ocean.annotations.openWorldHint,false);
  assert.equal(ocean.securitySchemes[0].type,'oauth2');
  const vault=body.result.tools.find(x=>x.name==='maison_ingest_vault_candidate');
  assert.deepEqual(vault.inputSchema.required,['content_type','source_ocean_id','text']);
  assert.equal(vault.annotations.destructiveHint,false);
  assert.equal(vault.annotations.openWorldHint,false);
  assert.equal(vault.securitySchemes[0].type,'oauth2');
  const candidate=body.result.tools.find(x=>x.name==='maison_ingest_candidate');
  assert.deepEqual(candidate.inputSchema.required,['candidate_type','source_ocean_id','title','body','rationale']);
  assert.equal(candidate.annotations.openWorldHint,false);
  const list=body.result.tools.find(x=>x.name==='maison_list_candidates');
  assert.equal(list.annotations.readOnlyHint,true);
});

test('MCP Ocean tool authenticates and persists directly to D1',async()=>{
  class Statement{
    constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
    bind(...params){this.params=params;return this;}
    async run(){this.db.writes.push({sql:this.sql,params:this.params});return {success:true,meta:{changes:1}};}
  }
  class DB{
    constructor(){this.writes=[];}
    prepare(sql){return new Statement(this,sql);}
  }
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'user-1'}),{status:200,headers:{'content-type':'application/json'}});
  try{
    const db=new DB();
    const request=new Request('https://maison.example/mcp',{
      method:'POST',
      headers:{'content-type':'application/json',Authorization:'Bearer oauth-token'},
      body:JSON.stringify({jsonrpc:'2.0',id:7,method:'tools/call',params:{
        name:'maison_ingest_ocean_signal',
        arguments:{
          kind:'hypothesis',
          ocean_key:'teste-mcp-ocean',
          source_ref:'radar:test',
          summary:'Sinal de teste do Radar gravado diretamente no D1.',
          evidence_roots:['https://example.org/a'],
          relevance_score:64,
          commercial_score:35,
          observed_at:'2026-10-01T18:00:00.000Z'
        }
      }})
    });
    const response=await handleMaisonMcpRequest(request,{
      OCEAN_MEMORY_ENABLED:'true',
      GROWTH_DB:db,
      MAISON_MCP_CONFIG:JSON.stringify({
        supabase_url:'https://example.supabase.co',
        supabase_publishable_key:'public-key',
        allowed_subject:'user-1'
      })
    });
    const body=await response.json();
    assert.equal(body.result.isError,false);
    assert.equal(body.result.structuredContent.ocean_key,'teste-mcp-ocean');
    assert.equal(body.result.structuredContent.github_required_for_persistence,false);
    assert.equal(body.result.structuredContent.d1_writes_per_unique_ingest,2);
    assert.equal(db.writes.length,2);
  }finally{
    globalThis.fetch=originalFetch;
  }
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
