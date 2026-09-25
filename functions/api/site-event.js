import {
  SiteTelemetryError,
  normalizeSiteTelemetry,
  forwardSiteTelemetry
} from '../_lib/site-telemetry.js';

function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin){
      let supplied;
      try{supplied=new URL(origin).origin}catch{throw new SiteTelemetryError('origin_forbidden',403);}
      if(supplied!==url.origin)throw new SiteTelemetryError('origin_forbidden',403);
    }
    const type=request.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('application/json'))return json({ok:false,error:'json_required'},415);
    const declared=Number(request.headers.get('content-length')||0);
    if(Number.isFinite(declared)&&declared>8192)return json({ok:false,error:'payload_too_large'},413);
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>8192)return json({ok:false,error:'payload_too_large'},413);
    let body;
    try{body=JSON.parse(raw);}catch{return json({ok:false,error:'invalid_json'},400);}
    const normalized=normalizeSiteTelemetry(body);
    const result=await forwardSiteTelemetry(env,normalized);
    if(result.status==='rejected')return json({ok:false,error:'event_rejected'},400);
    return json({ok:true,accepted:result.status==='forwarded',status:result.status},202);
  }catch(error){
    if(error instanceof SiteTelemetryError)return json({ok:false,error:error.code},error.status);
    return json({ok:false,error:'site_telemetry_failed'},500);
  }
}
export async function onRequestGet(){return json({ok:false,error:'method_not_allowed'},405);}
