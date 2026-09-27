// MAISON JF · zero-cost short-video bridge
// This bridge deliberately uses only unauthenticated public ZeroGPU Spaces.
// No HF token, billing credential, paid inference endpoint or automatic purchase is accepted.

const DEFAULTS = [
  { id: 'wan22-tinchote', base: 'https://tinchote-wan-2-2-14b-image-to-video.hf.space', api: 'generate_video' }
];

function on(v){ return String(v ?? '').toLowerCase() === 'true'; }
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function auth(req,env){return !!env.VIDEO_GENERATION_TOKEN && req.headers.get('Authorization')===`Bearer ${env.VIDEO_GENERATION_TOKEN}`;}
function providers(env){
  if(!env.VIDEO_ZERO_COST_PROVIDERS_JSON) return DEFAULTS;
  let p; try{p=JSON.parse(env.VIDEO_ZERO_COST_PROVIDERS_JSON);}catch{throw new Error('invalid_video_provider_registry');}
  if(!Array.isArray(p)||!p.length) throw new Error('empty_video_provider_registry');
  return p.map(x=>{
    const base=String(x.base||'').replace(/\/+$/,'');
    if(!/^https:\/\/[a-z0-9-]+\.hf\.space$/i.test(base)) throw new Error('video_provider_must_be_public_hf_space');
    return {id:String(x.id||''),base,api:String(x.api||'generate_video')};
  });
}
function fileData(url){
  const u=new URL(url);
  if(u.protocol!=='https:') throw new Error('image_url_must_be_https');
  return {path:u.href,url:u.href,orig_name:'maison-source.webp',meta:{_type:'gradio.FileData'}};
}
async function submit(p,body){
  const duration=Math.min(3,Math.max(1,Number(body.duration_seconds||2)));
  const steps=Math.min(4,Math.max(1,Number(body.steps||4)));
  const seed=Number.isInteger(body.seed)?body.seed:42;
  const payload={data:[fileData(body.image_url),String(body.prompt||''),duration,steps,seed,body.randomize_seed!==false]};
  if(!payload.data[1].trim()) throw new Error('prompt_required');
  const r=await fetch(`${p.base}/gradio_api/call/${encodeURIComponent(p.api)}`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  });
  if(!r.ok) throw new Error(`zerogpu_submit_http_${r.status}`);
  const out=await r.json();
  if(!out.event_id) throw new Error('zerogpu_missing_event_id');
  return {event_id:out.event_id,provider:p};
}
export async function handleVideoGenerationRequest(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/internal/video')) return null;
  if(!on(env.VIDEO_GENERATION_ENABLED)) return json({error:'not_found'},404);
  if(!auth(request,env)) return json({error:'unauthorized'},401);
  try{
    if(request.method==='GET'&&url.pathname==='/internal/video/health'){
      return json({service:'maison_short_video',enabled:true,mode:'zero_cost_only',billing_allowed:false,authenticated_hf_usage:false,providers:providers(env).map(x=>x.id),max_clip_seconds:3,max_steps:4});
    }
    if(request.method==='POST'&&url.pathname==='/internal/video/generate'){
      const body=await request.json();
      if(typeof body.image_url!=='string'||!body.image_url) throw new Error('image_url_required');
      let last=null;
      for(const p of providers(env)){
        try{
          const job=await submit(p,body);
          return json({job_id:job.event_id,provider:job.provider.id,state:'queued',cost_mode:'zero_cost_unauthenticated',billing_allowed:false,result_path:`/internal/video/result?provider=${encodeURIComponent(job.provider.id)}&job_id=${encodeURIComponent(job.event_id)}`},202);
        }catch(e){last=e;}
      }
      throw last||new Error('no_zero_cost_video_provider_available');
    }
    if(request.method==='GET'&&url.pathname==='/internal/video/result'){
      const p=providers(env).find(x=>x.id===url.searchParams.get('provider'));
      const job=String(url.searchParams.get('job_id')||'');
      if(!p||!/^[A-Za-z0-9_-]{6,200}$/.test(job)) throw new Error('invalid_video_job');
      const r=await fetch(`${p.base}/gradio_api/call/${encodeURIComponent(p.api)}/${encodeURIComponent(job)}`,{headers:{Accept:'text/event-stream'}});
      if(!r.ok) return json({state:'provider_error',provider:p.id,status:r.status},502);
      return new Response(r.body,{status:200,headers:{'Content-Type':r.headers.get('Content-Type')||'text/event-stream','Cache-Control':'no-store','X-Maison-Video-Provider':p.id,'X-Maison-Cost-Mode':'zero-cost-only'}});
    }
    return json({error:'not_found'},404);
  }catch(e){return json({error:e?.message||'video_request_failed',billing_allowed:false},400);}
}
