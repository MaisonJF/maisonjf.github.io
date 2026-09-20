const SERVICES={
  'tarot-expresso':'Tarot · Uma pergunta',
  'tarot':'Tarot · Uma consulta',
  'tarot-terapeutico':'Tarot · Aprofundar',
  'consulta-escrita-breve':'Por escrito · Breve',
  'consulta-escrita-aprofundada':'Por escrito · Aprofundada',
  'escuta':'Escuta Orientada'
};

export async function onRequestGet({request,env}){
  try{
    if(!env?.STRIPE_LIVE_SECRET_KEY)return json({error:'Checkout temporariamente indisponível.'},503);
    const url=new URL(request.url);
    const sessionId=String(url.searchParams.get('session_id')||'');
    if(!/^cs_live_[A-Za-z0-9]+$/.test(sessionId))return json({error:'Sessão inválida.'},400);

    const response=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId),{
      headers:{Authorization:'Bearer '+env.STRIPE_LIVE_SECRET_KEY}
    });
    const session=await response.json().catch(()=>({}));
    if(!response.ok)return json({error:'Não foi possível confirmar esta compra.'},response.status);

    const slug=String(session.metadata?.service_slug||'');
    if(!session.livemode||session.metadata?.environment!=='maison-jf-live'||session.metadata?.source!=='consultation-live'||!SERVICES[slug]){
      return json({error:'Esta sessão não pertence a uma consulta MAISON JF®.'},403);
    }

    return json({
      id:session.id,
      status:session.status||null,
      payment_status:session.payment_status||null,
      amount_total:Number.isInteger(session.amount_total)?session.amount_total:null,
      currency:session.currency||'eur',
      email:session.customer_details?.email||null,
      service_slug:slug,
      service_name:SERVICES[slug]
    });
  }catch{
    return json({error:'Não foi possível verificar a compra.'},500);
  }
}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'private, no-store, max-age=0',
    'x-content-type-options':'nosniff'
  }});
}
