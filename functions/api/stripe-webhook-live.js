import { recordStripePurchase } from '../_lib/commerce-events.js';

export async function onRequestPost({request,env}){
  try{
    const secret=String(env?.STRIPE_LIVE_WEBHOOK_SECRET||'');
    if(!secret)return json({ok:false,error:'Webhook não configurado.'},503);
    const signature=String(request.headers.get('stripe-signature')||'');
    const payload=await request.text();
    if(!await verifyStripeSignature(payload,signature,secret))return json({ok:false,error:'Assinatura inválida.'},400);

    const event=JSON.parse(payload);
    if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(String(event?.type||''))){
      return json({ok:true,ignored:true});
    }
    const session=event?.data?.object;
    if(!session?.livemode||session?.metadata?.environment!=='maison-jf-live'){
      return json({ok:true,ignored:true});
    }
    if(session.payment_status!=='paid')return json({ok:true,pending:true});
    if(!env?.MAISON_BRAIN_DB)return json({ok:false,error:'Brain indisponível.'},503);

    await recordStripePurchase(env.MAISON_BRAIN_DB,session);
    return json({ok:true});
  }catch{
    return json({ok:false,error:'Não foi possível processar o evento.'},500);
  }
}
export async function onRequestGet(){return json({ok:false,error:'Método não permitido.'},405)}

async function verifyStripeSignature(payload,header,secret){
  const parts=header.split(',').map(x=>x.trim()).filter(Boolean);
  const timestamp=parts.find(x=>x.startsWith('t='))?.slice(2);
  const signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
  if(!timestamp||!signatures.length)return false;
  const ts=Number(timestamp);
  if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+payload));
  const expected=[...new Uint8Array(signed)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return signatures.some(sig=>constantTimeEqual(expected,String(sig||'')));
}
function constantTimeEqual(a,b){
  if(a.length!==b.length)return false;
  let diff=0; for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
