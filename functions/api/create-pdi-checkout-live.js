import { pdiThemeAvailability } from '../_lib/pdi-theme-catalogue.js';
import { appendCheckoutAttribution } from '../_lib/checkout-attribution.js';

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin){
      return json({error:'Origem não autorizada.'},403);
    }
    if(!env?.STRIPE_LIVE_SECRET_KEY){
      return json({error:'Checkout temporariamente indisponível.'},503);
    }

    const body=await request.json().catch(()=>({}));
    const theme=String(body?.theme||'relacoes');
    const product=await pdiThemeAvailability(env,theme);
    if(!product)return json({error:'Produto inválido.'},400);
    if(!product.available)return json({error:'Este tema ainda não está disponível para compra.'},409);

    const params=new URLSearchParams();
    params.set('mode','payment');
    params.set('line_items[0][quantity]','1');
    params.set('line_items[0][price_data][currency]',String(product.currency||'eur'));
    params.set('line_items[0][price_data][unit_amount]',String(product.amount));
    params.set('line_items[0][price_data][product_data][name]','PÁRA DE IGNORAR! · '+product.label);
    params.set('success_url',url.origin+'/para-de-ignorar/jogar.html?session_id={CHECKOUT_SESSION_ID}&theme='+encodeURIComponent(product.slug));
    params.set('cancel_url',url.origin+'/para-de-ignorar/?theme='+encodeURIComponent(product.slug));
    params.set('metadata[environment]','maison-jf-live');
    params.set('metadata[source]','para-de-ignorar-live');
    params.set('metadata[pdi_access]','single-session');
    params.set('metadata[pdi_theme]',product.slug);
    appendCheckoutAttribution(params,body?.attribution,request.headers.get('Referer')||'',url.origin);

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
      return json({error:'Não foi possível iniciar o checkout.'},stripeResponse.status||502);
    }
    return json({url:session.url});
  }catch{
    return json({error:'Não foi possível iniciar o checkout.'},500);
  }
}

export async function onRequestGet(){
  return json({error:'Método não permitido.'},405);
}

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
