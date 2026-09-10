const PRODUCTS = {
  bruma: 'price_1UECuk5O4m7iPegSqgyaIVvN',
  oleo: 'price_1UECv65O4m7iPegSVGK8qedO'
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'Falta configurar a chave Stripe do ambiente de teste no Cloudflare.' }, 503);
    }

    const body = await request.json();
    const requested = Array.isArray(body?.items) ? body.items : [];
    const items = requested
      .map(item => ({
        id: String(item?.id || ''),
        quantity: Math.max(1, Math.min(10, Number(item?.quantity || 1)))
      }))
      .filter(item => PRODUCTS[item.id]);

    if (!items.length) return json({ error: 'O carrinho está vazio.' }, 400);

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', origin + '/checkout-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', origin + '/checkout-teste.html?cancelado=1');
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('phone_number_collection[enabled]', 'true');
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

    const session = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return json({ error: session?.error?.message || 'A Stripe recusou a criação do checkout.' }, stripeResponse.status);
    }

    return json({ url: session.url });
  } catch (error) {
    return json({ error: 'Não foi possível preparar o checkout de teste.' }, 500);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}