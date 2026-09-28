// MAISON JF · minimal Streamable HTTP MCP bridge for the short-video engine
// Initial scope is intentionally narrow: health, generate, result.
// VIDEO_GENERATION_TOKEN never leaves the Worker.

const JSON_HEADERS = {'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const MCP_VERSION = '2025-06-18';

function rpc(id,result){return new Response(JSON.stringify({jsonrpc:'2.0',id,result}),{headers:JSON_HEADERS});}
function rpcError(id,code,message){return new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}}),{headers:JSON_HEADERS});}
function toolText(payload,isError=false){return {content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError};}

function tools(){
  return [
    {
      name:'maison_video_health',
      title:'Maison video health',
      description:'Check the MAISON JF zero-cost short-video engine health and configured providers.',
      inputSchema:{type:'object',properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}
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
      annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}
    },
    {
      name:'maison_video_result',
      title:'Maison video result',
      description:'Read the provider result stream for a previously queued MAISON JF video job.',
      inputSchema:{type:'object',required:['provider','job_id'],properties:{
        provider:{type:'string',enum:['wan22-aoti-fast','wan22-r3gm-preview']},
        job_id:{type:'string',minLength:6,maxLength:200}
      },additionalProperties:false},
      annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true}
    }
  ];
}

async function internal(request,env,path,init={}){
  if(!env.VIDEO_GENERATION_TOKEN) throw new Error('video_generation_token_missing');
  const u=new URL(request.url); u.pathname=path; u.search='';
  const headers=new Headers(init.headers||{});
  headers.set('X-Maison-Video-Token',env.VIDEO_GENERATION_TOKEN);
  return fetch(new Request(u.toString(),{...init,headers}));
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
      const name=String(msg.params?.name||'');
      const args=msg.params?.arguments||{};
      return rpc(id,await callTool(request,env,name,args));
    }
    return rpcError(id,-32601,'Method not found');
  }catch(e){return rpc(id,toolText({error:e?.message||'mcp_tool_failed'},true));}
}
