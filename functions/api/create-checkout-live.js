const PRODUCTS = {
  turista: { price: 'price_1UEoZP5H3wYRPmPVLTG7nmwl', max: 1, unitCents: 299 },
  meandros: { price: 'price_1UEoWC5H3wYRPmPVFiVh4xT8', max: 1, unitCents: 499 }
};

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) {
      return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    }

    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get('Origin');
    if (originHeader && new URL(originHeader).origin !== requestOrigin) {
      return json({ error: 'Origem inválida.' }, 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }

    const requested = Array.isArray(body?.items) ? body.items.slice(0, 2) : [];
    const quantities = new Map();

    for (const item of requested) {
      const id = String(item?.id || '');
      const quantity = Number(item?.quantity);
      const product = PRODUCTS[id];
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.max) continue;
      quantities.set(id, 1);
    }

    const items = [...quantities.entries()].map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return json({ error: 'Escolhe pelo menos um ebook.' }, 400);

    const ebookIds = items.map(item => item.id);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();

    params.set('mode', 'payment');
    params.set('success_url', origin + '/checkout-sucesso-live.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', origin + '/editions.html?checkout_cancelado=1');
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('locale', 'pt');
    params.set('custom_fields[0][key]', 'nif');
    params.set('custom_fields[0][label][type]', 'custom');
    params.set('custom_fields[0][label][custom]', 'NIF (opcional, para faturação)');
    params.set('custom_fields[0][type]', 'numeric');
    params.set('custom_fields[0][optional]', 'true');
    params.set('custom_fields[0][numeric][minimum_length]', '9');
    params.set('custom_fields[0][numeric][maximum_length]', '9');
    params.set('custom_text[submit][message]', 'Ao pagar, confirmas a compra e aceitas as condições da MAISON JF®: https://maison-jf.com/informacao-legal.html. O download fica disponível após confirmação do pagamento. A fatura fiscal é emitida pela MAISON JF® separadamente.');
    params.set('submit_type', 'pay');
    params.set('metadata[environment]', 'maison-jf-live');
    params.set('metadata[source]', 'editions-live');
    params.set('metadata[has_physical]', '0');
    params.set('metadata[ebook_ids]', ebookIds.join(','));

    items.forEach((item, index) => {
      params.set('line_items[' + index + '][price]', PRODUCTS[item.id].price);
      params.set('line_items[' + index + '][quantity]', String(item.quantity));
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.STRIPE_LIVE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const session = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok) {
      return json({ error: session?.error?.message || 'Não foi possível abrir o checkout.' }, stripeResponse.status);
    }

    if (!session?.livemode || !session?.url) {
      return json({ error: 'A sessão de pagamento não ficou disponível em produção.' }, 502);
    }

    return json({ url: session.url });
  } catch {
    return json({ error: 'Não foi possível preparar o checkout.' }, 500);
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
