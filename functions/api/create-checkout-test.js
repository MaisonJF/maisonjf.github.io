const PRODUCTS = {
  bruma: 'price_1UECuk5O4m7iPegSqgyaIVvN',
  oleo: 'price_1UECv65O4m7iPegSVGK8qedO',
  escalda: 'price_1UEQLo5O4m7iPegS8BOzlT0P',
  vela: 'price_1UEQLr5O4m7iPegSWWLhiNWP'
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'Falta configurar a chave Stripe do ambiente de teste no Cloudflare.' }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }

    const requested = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];
    const quantities = new Map();

    for (const item of requested) {
      const id = String(item?.id || '');
      const quantity = Number(item?.quantity);
      if (!PRODUCTS[id] || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) continue;
      quantities.set(id, Math.min(10, (quantities.get(id) || 0) + quantity));
    }

    const items = [...quantities.entries()].map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return json({ error: 'O carrinho está vazio ou contém dados inválidos.' }, 400);

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', origin + '/checkout-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', origin + '/checkout-teste.html?cancelado=1');
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('phone_number_collection[enabled]', 'true');
    params.set('tax_id_collection[enabled]', 'true');
    params.set('shipping_address_collection[allowed_countries][0]', 'PT');
    params.set('payment_method_types[0]', 'card');
    params.set('payment_method_types[1]', 'mb_way');
    params.set('submit_type', 'pay');
    params.set('metadata[environment]', 'maison-jf-sandbox');
    params.set('metadata[source]', 'site-cart-test');

    items.forEach((item, index) => {
      params.set(`line_items[${index}][price]`, PRODUCTS[item.id]);
      params.set(`line_items[${index}][quantity]`, String(item.quantity));
      params.set(`line_items[${index}][adjustable_quantity][enabled]`, 'true');
      params.set(`line_items[${index}][adjustable_quantity][minimum]`, '1');
      params.set(`line_items[${index}][adjustable_quantity][maximum]`, '10');
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const session = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok) {
      return json({ error: session?.error?.message || 'A Stripe recusou a criação do checkout.' }, stripeResponse.status);
    }

    if (!session?.url) {
      return json({ error: 'A Stripe criou a sessão sem devolver um endereço de checkout.' }, 502);
    }

    return json({ url: session.url });
  } catch {
    return json({ error: 'Não foi possível preparar o checkout de teste.' }, 500);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}