export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get('Origin');
    if (originHeader && new URL(originHeader).origin !== requestOrigin) return json({ error: 'Origem inválida.' }, 403);
    let body = {};
    try { body = await request.json(); } catch { return json({ error: 'Pedido inválido.' }, 400); }
    if (body?.theme !== 'amor') return json({ error: 'Este território ainda não está disponível.' }, 400);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', origin + '/oraculo/amor-leitura.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', origin + '/oraculo/amor.html?checkout_cancelado=1');
    params.set('locale', 'pt');
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('line_items[0][price_data][currency]', 'eur');
    params.set('line_items[0][price_data][unit_amount]', '200');
    params.set('line_items[0][price_data][product_data][name]', 'Oráculo MAISON JF® | Amor & Relações');
    params.set('line_items[0][price_data][product_data][description]', 'Uma abertura simbólica. Uma leitura.');
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[environment]', 'maison-jf-live');
    params.set('metadata[source]', 'oracle-live');
    params.set('metadata[oracle_theme]', 'amor');
    params.set('metadata[oracle_access]', 'single-reading');
    params.set('submit_type', 'pay');
    params.set('custom_text[submit][message]', 'Ao pagar, confirmas uma abertura do Oráculo MAISON JF® e aceitas as condições em maison-jf.com/informacao-legal.html.');
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', { method:'POST', headers:{ Authorization:'Bearer ' + env.STRIPE_LIVE_SECRET_KEY, 'Content-Type':'application/x-www-form-urlencoded' }, body:params });
    const session = await stripeResponse.json().catch(()=>({}));
    if (!stripeResponse.ok) return json({ error: session?.error?.message || 'Não foi possível abrir o checkout.' }, stripeResponse.status);
    if (!session?.livemode || !session?.url) return json({ error: 'A sessão de pagamento não ficou disponível em produção.' }, 502);
    return json({ url: session.url });
  } catch { return json({ error: 'Não foi possível preparar o checkout.' }, 500); }
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}