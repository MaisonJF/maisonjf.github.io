import { ORACLE_TERRITORIES } from '../_lib/oracle-territories.js';

const TERRITORIES=Object.fromEntries(
  ORACLE_TERRITORIES.map(t=>[t.slug,{label:t.label,page:t.slug+'.html'}])
);

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get('Origin');
    if (originHeader && new URL(originHeader).origin !== requestOrigin) return json({ error: 'Origem inválida.' }, 403);
    let body = {};
    try { body = await request.json(); } catch { return json({ error: 'Pedido inválido.' }, 400); }
    const theme=String(body?.theme||'');
    const territory=TERRITORIES[theme];
    if (!territory) return json({ error: 'Este território ainda não está disponível.' }, 400);

    const origin = new URL(request.url).origin;
    const successUrl = origin + '/oraculo/leitura.html?theme=' + encodeURIComponent(theme) + '&session_id={CHECKOUT_SESSION_ID}';

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', origin + '/oraculo/' + territory.page + '?checkout_cancelado=1');
    params.set('locale', 'pt');
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('line_items[0][price_data][currency]', 'eur');
    params.set('line_items[0][price_data][unit_amount]', '200');
    params.set('line_items[0][price_data][product_data][name]', 'Oráculo MAISON JF® | ' + territory.label);
    params.set('line_items[0][price_data][product_data][description]', 'Uma abertura simbólica. Uma leitura.');
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[environment]', 'maison-jf-live');
    params.set('metadata[source]', 'oracle-live');
    params.set('metadata[oracle_theme]', theme);
    params.set('metadata[oracle_access]', 'single-reading');
    appendAttribution(params,body?.attribution);
    params.set('submit_type', 'pay');
    params.set('custom_text[submit][message]', 'Ao pagar, confirmas uma abertura do Oráculo MAISON JF® e aceitas as condições em maison-jf.com/informacao-legal.html.');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{ Authorization:'Bearer ' + env.STRIPE_LIVE_SECRET_KEY, 'Content-Type':'application/x-www-form-urlencoded' },
      body:params
    });
    const session = await stripeResponse.json().catch(()=>({}));
    if (!stripeResponse.ok) return json({ error: session?.error?.message || 'Não foi possível abrir o checkout.' }, stripeResponse.status);
    if (!session?.livemode || !session?.url) return json({ error: 'A sessão de pagamento não ficou disponível em produção.' }, 502);
    return json({ url: session.url });
  } catch {
    return json({ error: 'Não foi possível preparar o checkout.' }, 500);
  }
}
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
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
