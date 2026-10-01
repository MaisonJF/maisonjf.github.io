import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMaisonEditorialMcp, maisonEditorialTools } from '../../../functions/mcp.js';

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql;this.params=[];}
  bind(...params){this.params=params;return this;}
  async run(){this.db.writes.push({sql:this.sql,params:this.params});return {success:true,meta:{changes:1}};}
}
class DB{
  constructor(){this.writes=[];}
  prepare(sql){return new Statement(this,sql);}
}

function post(method,params,token=''){
  const headers={'content-type':'application/json'};
  if(token)headers.authorization='Bearer '+token;
  return new Request('https://maison-jf.com/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
}

test('public Maison MCP exposes only bounded D1 ingest tools',()=>{
  assert.deepEqual(maisonEditorialTools().map(x=>x.name),['maison_ingest_ocean_signal','maison_ingest_vault_candidate']);
});
test('public Maison MCP authenticates allowed operator and writes Ocean to D1',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    id:'operator-1',email:'maisonjf@proton.me',email_confirmed_at:'2026-10-01T00:00:00Z'
  }),{status:200,headers:{'content-type':'application/json'}});
  try{
    const db=new DB();
    const response=await handleMaisonEditorialMcp(post('tools/call',{
      name:'maison_ingest_ocean_signal',
      arguments:{
        kind:'hypothesis',ocean_key:'mcp-pages-test',source_ref:'test:pages-mcp',
        summary:'Sinal seguro de teste para validar a ponte Pages MCP para D1.',
        evidence_roots:['https://example.org/a'],theme_candidates:['presença sem atenção'],
        commercial_adjacency:[{offer:'para-de-ignorar'}],relevance_score:64,commercial_score:55,
        observed_at:'2026-10-01T19:00:00.000Z'
      }
    },'oauth-token'),{
      MAISON_SOS_SUPABASE_URL:'https://example.supabase.co',
      MAISON_SOS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'x'.repeat(30),
      MAISON_BRAIN_DB:db
    });
    assert.equal(response.status,200);
    const body=await response.json();
    assert.equal(body.result.isError,false);
    assert.equal(body.result.structuredContent.ocean_key,'mcp-pages-test');
    assert.equal(body.result.structuredContent.d1_writes_per_unique_ingest,2);
    assert.equal(db.writes.length,2);
  }finally{globalThis.fetch=originalFetch;}
});
test('public Maison MCP rejects a different Supabase account',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    id:'other',email:'other@example.com',email_confirmed_at:'2026-10-01T00:00:00Z'
  }),{status:200,headers:{'content-type':'application/json'}});
  try{
    const response=await handleMaisonEditorialMcp(post('tools/call',{
      name:'maison_ingest_ocean_signal',arguments:{}
    },'oauth-token'),{
      MAISON_SOS_SUPABASE_URL:'https://example.supabase.co',
      MAISON_SOS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'x'.repeat(30),
      MAISON_BRAIN_DB:new DB()
    });
    assert.equal(response.status,401);
    assert.match(response.headers.get('www-authenticate')||'',/oauth-protected-resource/);
  }finally{globalThis.fetch=originalFetch;}
});
