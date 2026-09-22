const SERVICES={
  'tarot':{name:'Tarot · Uma consulta',amount:3500},
  'consulta-escrita-breve':{name:'Por escrito · Breve',amount:2500},
  'consulta-escrita-aprofundada':{name:'Por escrito · Aprofundada',amount:4500},
  'escuta':{name:'Escuta Orientada',amount:6000}
};

export async function onRequestPost({request,env}){
  try{
    const origin=new URL(request.url).origin;
    const originHeader=request.headers.get('Origin');
    if(originHeader && new URL(originHeader).origin!==origin)return json({error:'Origem inválida.'},403);
    if(!env?.STRIPE_LIVE_SECRET_KEY)return json({error:'Checkout temporariamente indisponível.'},503);

    const body=await request.json().catch(()=>null);
    const slug=String(body?.slug||'');
    const service=SERVICES[slug];
    if(!service)return json({error:'Consulta inválida.'},400);

    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('success_url',origin+'/checkout-consulta-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url',origin+'/servicos/#consultas');
    params.set('customer_creation','always');
    params.set('billing_address_collection','auto');
    params.set('phone_number_collection[enabled]','true');
    params.set('locale','pt');
    params.set('submit_type','pay');
    params.set('metadata[environment]','maison-jf-live');
    params.set('metadata[source]','consultation-live');
    params.set('metadata[service_slug]',slug);
    appendAttribution(params,body?.attribution);

    params.set('custom_fields[0][key]','nif');
    params.set('custom_fields[0][label][type]','custom');
    params.set('custom_fields[0][label][custom]','NIF (opcional, para faturação)');
    params.set('custom_fields[0][type]','numeric');
    params.set('custom_fields[0][optional]','true');
    params.set('custom_fields[0][numeric][minimum_length]','9');
    params.set('custom_fields[0][numeric][maximum_length]','9');

    params.set('custom_text[submit][message]','Depois do pagamento, recebes a confirmação e podes combinar o horário ou enviar a questão à MAISON JF®. Ao pagar, aceitas as condições da Maison.');

    params.set('line_items[0][price_data][currency]','eur');
    params.set('line_items[0][price_data][unit_amount]',String(service.amount));
    params.set('line_items[0][price_data][product_data][name]',service.name);
    params.set('line_items[0][quantity]','1');

    const stripeResponse=await fetch('https://api.stripe.com/v1/checkout/sessions',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+env.STRIPE_LIVE_SECRET_KEY,
        'content-type':'application/x-www-form-urlencoded'
      },
      body:params.toString()
    });
    const session=await stripeResponse.json().catch(()=>({}));
    if(!stripeResponse.ok||!session?.url){
      return json({error:session?.error?.message||'Não foi possível abrir o checkout.'},stripeResponse.status||502);
    }
    return json({url:session.url});
  }catch{
    return json({error:'Não foi possível preparar o checkout.'},500);
  }
}
export async function onRequestGet(){return json({error:'Método não permitido.'},405)}
function appendAttribution(params,raw){
  const a=raw&&typeof raw==='object'?raw:{};
  const fields={
    recommendation_source:'rec_source',recommendation_offer:'rec_offer',recommendation_result:'rec_result',recommendation_route:'rec_route',recommendation_brain:'rec_brain',
    acquisition_referrer:'acq_referrer',acquisition_landing:'acq_landing',acquisition_utm_source:'utm_source',acquisition_utm_medium:'utm_medium',acquisition_utm_campaign:'utm_campaign'
  };
  for(const [input,key] of Object.entries(fields)){
    const value=String(a[input]||'').trim().slice(0,450);
    if(value)params.set('metadata['+key+']',value);
  }
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }});
}
