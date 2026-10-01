import { ingestOceanMemory } from '../workers/maison-intelligence/src/ocean_memory.js';
import { ingestVaultCandidate } from '../workers/maison-intelligence/src/vault_candidates.js';

const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const MCP_VERSION='2025-06-18';
const ALLOWED_EMAIL_SHA256='0f63626f4bb200dcea81d29de36dd74809ead3260de742f69c41465085815dd8';
const SCOPES=['openid','email','profile'];

function cors(extra={}){return {...JSON_HEADERS,'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS',...extra};}
function rpc(id,result){return new Response(JSON.stringify({jsonrpc:'2.0',id,result}),{headers:cors()});}
function rpcError(id,code,message,status=200,extra={}){return new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}}),{status,headers:cors(extra)});}
function toolText(payload,isError=false){return {content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError};}
function resourceUrl(request){return new URL('/mcp',request.url).toString();}
function metadataUrl(request){return new URL('/.well-known/oauth-protected-resource',request.url).toString();}
function challenge(request){return `Bearer resource_metadata="${metadataUrl(request)}", error="invalid_token", error_description="Maison JF authentication required"`;}

function authConfig(env){
  const url=String(env?.MAISON_SOS_SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const key=String(env?.MAISON_SOS_SUPABASE_PUBLISHABLE_KEY||'').trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||key.length<20) throw new Error('mcp_auth_not_configured');
  return {url,key};
}
async function sha256(value){const data=new TextEncoder().encode(String(value));const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function authenticate(request,env){
  const auth=String(request.headers.get('authorization')||'');
  if(!auth.startsWith('Bearer ')) return null;
  const token=auth.slice(7).trim();
  if(!token) return null;
  const cfg=authConfig(env);
  const r=await fetch(cfg.url+'/auth/v1/user',{headers:{apikey:cfg.key,Authorization:'Bearer '+token,Accept:'application/json'}});
  if(!r.ok) return null;
  const user=await r.json().catch(()=>null);
  const email=String(user?.email||'').trim().toLowerCase();
  if(!email||!user?.email_confirmed_at) return null;
  if((await sha256(email))!==ALLOWED_EMAIL_SHA256) return null;
  return {id:String(user.id||''),email_verified:true};
}

function tools(){
  return [
    {
      name:'maison_ingest_ocean_signal',
      title:'Ingest Maison Ocean signal',
      description:'Persist one privacy-reviewed Ocean signal directly into MAISON JF D1 working memory.',
      inputSchema:{type:'object',required:['ocean_key','source_ref','summary'],properties:{
        kind:{type:'string',enum:['signal','enrichment','hypothesis'],default:'signal'},
        ocean_key:{type:'string',minLength:2,maxLength:160},
        canonical_ocean_id:{type:'string',minLength:2,maxLength:160},
        source_ref:{type:'string',minLength:1,maxLength:2048},
        source_observation_id:{type:'string',minLength:40,maxLength:40},
        summary:{type:'string',minLength:1,maxLength:4000},
        evidence_roots:{type:'array',maxItems:30,items:{type:'string',minLength:1}},
        theme_candidates:{type:'array',maxItems:30,items:{type:'string',minLength:1}},
        commercial_adjacency:{type:'array',maxItems:30,items:{type:'object'}},
        relevance_score:{type:'integer',minimum:0,maximum:100,default:0},
        commercial_score:{type:'integer',minimum:0,maximum:100,default:0},
        observed_at:{type:'string',format:'date-time'}
      },additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}
    },
    {
      name:'maison_ingest_vault_candidate',
      title:'Ingest Maison editorial candidate',
      description:'Store one private candidate question or Oracle block in D1. It cannot approve, activate or publish content.',
      inputSchema:{type:'object',required:['content_type','source_ocean_id','text'],properties:{
        content_type:{type:'string',enum:['question','oracle_block']},
        source_ocean_id:{type:'string',minLength:2,maxLength:160},
        id:{type:'string',maxLength:183},
        canonical_key:{type:'string',maxLength:160},
        text:{type:'string',minLength:8,maxLength:4000},
        theme:{type:'string',minLength:2,maxLength:120},
        stage:{type:'string',enum:['open','recognize','deepen','touch','close','signature']},
        direction:{type:'string',enum:['me_to_you','you_to_me','mutual','either']},
        time_scope:{type:'string',enum:['past','present','future','timeless']},
        exposure:{type:'string',enum:['paid','public_social','reward','internal_test']},
        target:{type:'string',enum:['self','partner','both','prediction']},
        class:{type:'string',maxLength:80},
        subthemes:{type:'array',maxItems:12,items:{type:'string',maxLength:120}},
        similarity_group:{type:'string',maxLength:120},
        territory:{type:'string',minLength:2,maxLength:120},
        role:{type:'string',enum:['opening','recognition','tension','counterpoint','reframe','movement','close']},
        title:{type:'string',maxLength:180},
        tone:{type:'string',enum:['gentle','direct','intimate','clear','confrontational']},
        rarity:{type:'string',enum:['common','uncommon','rare']},
        tags:{type:'array',maxItems:20,items:{type:'string',maxLength:80}},
        pain_family:{type:'string',maxLength:120},
        subterritory:{type:'string',maxLength:120},
        emotional_function:{type:'string',maxLength:120},
        intensity:{type:'integer',minimum:1,maximum:4},
        cognitive_load:{type:'integer',minimum:1,maximum:5},
        vulnerability:{type:'integer',minimum:1,maximum:5},
        conflict_potential:{type:'integer',minimum:1,maximum:5},
        playfulness:{type:'integer',minimum:1,maximum:5},
        scores:{type:'object'},
        compatibility:{type:'object'},
        product_fit:{type:'object'}
      },additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}
    }
  ];
}

async function callTool(env,name,args){
  const runtime={...env,GROWTH_DB:env?.MAISON_BRAIN_DB};
  if(!runtime.GROWTH_DB) return toolText({error:'maison_brain_db_missing'},true);
  if(name==='maison_ingest_ocean_signal') return toolText(await ingestOceanMemory(runtime,args||{}),false);
  if(name==='maison_ingest_vault_candidate') return toolText(await ingestVaultCandidate(runtime,args||{}),false);
  return toolText({error:'unknown_tool'},true);
}

async function handle(request,env){
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors()});
  if(request.method==='GET') return new Response(JSON.stringify({service:'maison-jf-editorial-mcp',transport:'streamable-http',protocol:MCP_VERSION}),{headers:cors()});
  if(request.method!=='POST') return new Response('Method Not Allowed',{status:405,headers:cors({Allow:'GET, POST, OPTIONS'})});
  let msg; try{msg=await request.json();}catch{return rpcError(null,-32700,'Parse error');}
  const id=msg.id??null;
  try{
    if(msg.method==='initialize') return rpc(id,{protocolVersion:MCP_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'maison-jf-editorial',version:'1.0.0'}});
    if(msg.method==='notifications/initialized') return new Response(null,{status:202,headers:cors()});
    if(msg.method==='ping') return rpc(id,{});
    if(msg.method==='tools/list') return rpc(id,{tools:tools()});
    if(msg.method==='tools/call'){
      const identity=await authenticate(request,env);
      if(!identity) return rpcError(id,-32001,'Authentication required',401,{'www-authenticate':challenge(request)});
      return rpc(id,await callTool(env,String(msg.params?.name||''),msg.params?.arguments||{}));
    }
    return rpcError(id,-32601,'Method not found');
  }catch(e){
    return rpc(id,toolText({error:String(e?.message||'mcp_tool_failed').slice(0,300)},true));
  }
}

export async function onRequest(context){return handle(context.request,context.env);}
export { handle as handleMaisonEditorialMcp, tools as maisonEditorialTools, resourceUrl };
