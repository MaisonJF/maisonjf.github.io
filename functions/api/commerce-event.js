import { recordB2bLifecycleEvent } from '../_lib/commerce-telemetry.js';

// Public first-party adapter for the single observable B2B lead action.
// Later B2B stages remain server-side/internal observations; this endpoint does
// not expose a generic event writer and never stores customer identity/free text.
export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin)return json({ok:false,error:'Origem não autorizada.'},403);

    const body=await request.json().catch(()=>({}));
    if(String(body?.event_type||'').toLowerCase()!=='b2b.lead')return json({ok:false,error:'Evento inválido.'},400);

    const result=await recordB2bLifecycleEvent(env.GROWTH_DB,{
      event_type:'b2b.lead',
      idempotency_key:body?.idempotency_key,
      occurred_at:body?.occurred_at,
      journey_id:body?.journey_id,
      metadata:body?.metadata
    });
    return json({ok:true,...result});
  }catch(error){
    const message=String(error?.message||'');
    if(message==='idempotency_conflict')return json({ok:false,error:'Conflito de idempotência.'},409);
    if(message.startsWith('invalid_')||message.startsWith('unsupported_')||message==='value_currency_pair_required'){
      return json({ok:false,error:'Evento inválido.'},400);
    }
    console.error('Commerce telemetry error',message);
    return json({ok:false,error:'Não foi possível registar o evento.'},500);
  }
}
export async function onRequestGet(){return json({ok:false,error:'Método não permitido.'},405);}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}
