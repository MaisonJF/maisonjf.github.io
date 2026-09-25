import { recordB2BEvent } from '../_lib/commerce-events.js';

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin)return json({ok:false,error:'Origem não autorizada.'},403);
    if(!env.GROWTH_DB)return json({ok:true,ignored:true,reason:'growth_db_unavailable'});

    const body=await request.json().catch(()=>({}));
    const eventType=String(body?.event_type||'').trim().toLowerCase();
    if(eventType!=='b2b.lead')return json({ok:false,error:'Evento inválido.'},400);

    const idempotencyKey=String(body?.idempotency_key||'').trim();
    const metadata=body?.metadata&&typeof body.metadata==='object'&&!Array.isArray(body.metadata)?body.metadata:{};

    const result=await recordB2BEvent(env.GROWTH_DB,{
      event_type:'b2b.lead',
      idempotency_key:idempotencyKey,
      occurred_at:new Date().toISOString(),
      metadata
    });
    return json(result===false?{ok:true,ignored:true}:{...result});
  }catch(error){
    const code=String(error?.message||'');
    const bad=new Set([
      'unsupported_b2b_event','invalid_b2b_idempotency','unsupported_b2b_metadata',
      'invalid_b2b_metadata','missing_b2b_metadata','invalid_b2b_journey',
      'invalid_b2b_solution','invalid_b2b_value','invalid_b2b_currency'
    ]);
    if(bad.has(code))return json({ok:false,error:'Sinal B2B inválido.'},400);
    if(code==='b2b_idempotency_conflict')return json({ok:false,error:'Conflito de idempotência.'},409);
    return json({ok:false,error:'Não foi possível registar o sinal B2B.'},500);
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
