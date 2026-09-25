// First-party, privacy-safe Offer Brain interaction collector.
// This endpoint intentionally accepts only recommendation identifiers already
// exposed by Maison. It never accepts answers, free text, email or Stripe IDs.

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin) return json({ok:false,error:'Origem não autorizada.'},403);
    if(!env.GROWTH_DB) return json({ok:true,ignored:true,reason:'growth_db_unavailable'});

    const body=await request.json().catch(()=>({}));
    const eventType=String(body?.event_type||'').trim().toLowerCase();
    if(!['offer.exposure','offer.click'].includes(eventType)) return json({ok:false,error:'Evento inválido.'},400);

    const meta=safeMetadata(body?.metadata);
    if(!meta.offer_id) return json({ok:false,error:'Oferta em falta.'},400);

    const now=new Date().toISOString();
    const eventId='evt_'+uuidv7();
    const idem=String(body?.idempotency_key||'').trim().slice(0,200);
    if(idem.length<8) return json({ok:false,error:'Idempotência inválida.'},400);

    const metadataJson=JSON.stringify(meta);
    const payloadHash=await sha256(JSON.stringify({event_type:eventType,metadata:meta}));
    try{
      await env.GROWTH_DB.prepare(
        `INSERT INTO events
          (event_id,idempotency_key,event_type,source,schema_version,occurred_at,received_at,
           journey_id,asset_id,need_id,solution_id,value_minor,currency,privacy_class,payload_hash,
           metadata_json,rule_version_id,model_version_id)
         VALUES (?1,?2,?3,'site',2,?4,?4,NULL,NULL,NULL,NULL,NULL,NULL,'anonymous',?5,?6,NULL,NULL)`
      ).bind(eventId,idem,eventType,now,payloadHash,metadataJson).run();
    }catch(error){
      const existing=await env.GROWTH_DB.prepare(
        `SELECT event_id,payload_hash FROM events WHERE source='site' AND idempotency_key=?1 LIMIT 1`
      ).bind(idem).first();
      if(existing?.payload_hash===payloadHash) return json({ok:true,duplicate:true,event_id:existing.event_id});
      throw error;
    }
    return json({ok:true,event_id:eventId});
  }catch{
    return json({ok:false,error:'Não foi possível registar a interação.'},500);
  }
}
export async function onRequestGet(){return json({ok:false,error:'Método não permitido.'},405);}

function safeMetadata(raw){
  const x=raw&&typeof raw==='object'?raw:{};
  const out={};
  for(const key of ['path','surface','offer_id','recommendation_source','recommendation_result','recommendation_route','recommendation_brain']){
    const value=String(x[key]||'').trim();
    if(value)out[key]=value.slice(0,key==='path'?500:120);
  }
  return out;
}
async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function uuidv7(){
  const b=crypto.getRandomValues(new Uint8Array(16));
  let t=Date.now();
  for(let i=5;i>=0;i--){b[i]=t&255;t=Math.floor(t/256);}
  b[6]=(b[6]&15)|112;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});}
