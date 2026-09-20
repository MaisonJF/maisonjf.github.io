const PRODUCTS={
  'vela-vidro':'Vela Aromática 170 g',
  'vela-pequena':'Vela Aromática 70 g',
  'oleo-massagem':'Óleo de Massagem 60 ml',
  'nevoa':'Névoa de Ambiente 20 ml',
  'escalda-pes':'Escalda-Pés 150 g'
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

    const slug=String(session.metadata?.product_slug||'');
    if(!session.livemode||session.metadata?.environment!=='maison-jf-live'||session.metadata?.source!=='physical-product-live'||!PRODUCTS[slug]){
      return json({error:'Esta sessão não pertence a uma compra física da MAISON JF®.'},403);
    }
    return json({
      id:session.id,
      status:session.status||null,
      payment_status:session.payment_status||null,
      amount_total:Number.isInteger(session.amount_total)?session.amount_total:null,
      currency:session.currency||'eur',
      email:session.customer_details?.email||null,
      product_slug:slug,
      product_name:PRODUCTS[slug]
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
