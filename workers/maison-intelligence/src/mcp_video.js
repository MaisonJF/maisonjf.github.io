import { handleVideoGenerationRequest } from './video_generation.js';
// MAISON JF · minimal Streamable HTTP MCP bridge for the short-video engine
// Initial scope is intentionally narrow: health, generate, result.
// VIDEO_GENERATION_TOKEN never leaves the Worker.

const JSON_HEADERS = {'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const MCP_VERSION = '2025-06-18';
const MCP_SCOPE = 'openid email profile';

function supabaseOrigin(env){
  const raw=String(env.MAISON_MCP_SUPABASE_URL||'').trim().replace(/\\/+$/,'');
  if(!/^https:\/\/[a-z0-9-]+\\.supabase\\.co$/i.test(raw)) throw new Error('mcp_supabase_url_missing');
  return raw;
}
function resourceUrl(request){const u=new URL(request.url);return u.origin+'/mcp';}
function challenge(request){return `Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource',request.url).toString()}", error="invalid_token", error_description="Maison JF authentication required"`;}
async function authenticate(request,env){
  const auth=String(request.headers.get('Authorization')||'');
  if(!auth.startsWith('Bearer ')) return null;
  const token=auth.slice(7).trim();
  const key=String(env.MAISON_MCP_SUPABASE_PUBLISHABLE_KEY||'').trim();
  const allowed=String(env.MAISON_MCP_ALLOWED_SUBJECT||'').trim();
  if(!token||!key||!allowed) return null;
  const r=await fetch(supabaseOrigin(env)+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});
  if(!r.ok) return null;
  const user=await r.json().catch(()=>null);
  if(!user?.id||String(user.id)!==allowed) return null;
  return {id:String(user.id)};
}
function authError(request){return toolText({error:'authentication_required'},true,{ 'mcp/www_authenticate':[challenge(request)] });}

function rpc(id,result){return new Response(JSON.stringify({jsonrpc:'2.0',id,result}),{headers:JSON_HEADERS});}
function rpcError(id,code,message){return new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}}),{headers:JSON_HEADERS});}
function toolText(payload,isError=false,meta=null){const out={content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError};if(meta)out._meta=meta;return out;}

function tools(){
  return [
    {
      name:'maison_video_health',
      title:'Maison video health',
      description:'Check the MAISON JF zero-cost short-video engine health and configured providers.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
      securitySchemes:[{type:'oauth2',scopes:['openid','email','profile']}]
    },
    {
      name:'maison_generate_video',
      title:'Generate Maison video clip',
      description:'Queue one 1–3 second MAISON JF zero-cost video clip from an HTTPS source image and a motion prompt.',
      inputSchema:{type:'object',required:['image_url','prompt'],properties:{
        image_url:{type:'string',format:'uri',description:'HTTPS source image URL.'},
        prompt:{type:'string',minLength:1,maxLength:1600},
        duration_seconds:{type:'number',minimum:1,maximum:3,default:2},
        steps:{type:'integer',minimum:1,maximum:4,default:4},
        negative_prompt:{type:'string',maxLength:800},
        seed:{type:'integer'},
        randomize_seed:{type:'boolean',default:true}
      },additionalProperties:false},
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},
      securitySchemes:[{type:'oauth2',scopes:['openid','email','profile']}]
    },
    {
      name:'maison_video_result',
      title:'Maison video result',
      description:'Read the provider result stream for a previously queued MAISON JF video job.',
      inputSchema:{type:'object',required:['provider','job_id'],properties:{
        provider:{type:'string',enum:['wan22-aoti-fast','wan22-r3gm-preview']},
        job_id:{type:'string',minLength:6,maxLength:200}
      },additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},
      securitySchemes:[{type:'oauth2',scopes:['openid','email','profile']}]
    }
  ];
}

async function internal(request,env,path,init={}){
  if(!env.VIDEO_GENERATION_TOKEN) throw new Error('video_generation_token_missing');
  const u=new URL(request.url);
  const target=new URL(path,u.origin);
  const headers=new Headers(init.headers||{});
  headers.set('X-Maison-Video-Token',env.VIDEO_GENERATION_TOKEN);
  const forwarded=new Request(target.toString(),{...init,headers});
  const response=await handleVideoGenerationRequest(forwarded,env);
  if(!response) throw new Error('video_route_unavailable');
  return response;
}
async function callTool(request,env,name,args){
  if(name==='maison_video_health'){
    const r=await internal(request,env,'/internal/video/health');
    const body=await r.json().catch(()=>({error:'invalid_health_response'}));
    return toolText(body,!r.ok);
  }
  if(name==='maison_generate_video'){
    const r=await internal(request,env,'/internal/video/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(args||{})});
    const body=await r.json().catch(()=>({error:'invalid_generate_response'}));
    return toolText(body,!r.ok);
  }
  if(name==='maison_video_result'){
    const p=encodeURIComponent(String(args?.provider||''));
    const j=encodeURIComponent(String(args?.job_id||''));
    const r=await internal(request,env,`/internal/video/result?provider=${p}&job_id=${j}`);
    const text=await r.text();
    return toolText({provider:args?.provider,job_id:args?.job_id,state:r.ok?'provider_response':'provider_error',status:r.status,event_stream:text},!r.ok);
  }
  return toolText({error:'unknown_tool'},true);
}

export async function handleMaisonMcpRequest(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/.well-known/oauth-protected-resource'){
    let issuer;try{issuer=supabaseOrigin(env)+'/auth/v1';}catch{return new Response(JSON.stringify({error:'mcp_auth_not_configured'}),{status:503,headers:JSON_HEADERS});}
    return new Response(JSON.stringify({resource:resourceUrl(request),authorization_servers:[issuer],scopes_supported:MCP_SCOPE.split(' '),resource_documentation:'https://maison-jf.com/'}),{headers:JSON_HEADERS});
  }
  if(url.pathname!=='/mcp') return null;
  if(request.method==='GET') return new Response(JSON.stringify({service:'maison-jf-mcp',transport:'streamable-http',protocol:MCP_VERSION}),{headers:JSON_HEADERS});
  if(request.method!=='POST') return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, POST'}});
  let msg; try{msg=await request.json();}catch{return rpcError(null,-32700,'Parse error');}
  const id=msg.id??null;
  try{
    if(msg.method==='initialize') return rpc(id,{protocolVersion:MCP_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'maison-jf',version:'0.1.0'}});
    if(msg.method==='notifications/initialized') return new Response(null,{status:202});
    if(msg.method==='ping') return rpc(id,{});
    if(msg.method==='tools/list') return rpc(id,{tools:tools()});
    if(msg.method==='tools/call'){
      const identity=await authenticate(request,env);
      if(!identity) return rpc(id,authError(request));
      const name=String(msg.params?.name||'');
      const args=msg.params?.arguments||{};
      return rpc(id,await callTool(request,env,name,args));
    }
    return rpcError(id,-32601,'Method not found');
  }catch(e){return rpc(id,toolText({error:e?.message||'mcp_tool_failed'},true));}
}
