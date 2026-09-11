import { calculateShipping } from '../_lib/shipping-test.js';

const PRODUCTS = {
  bruma: { price: 'price_1UECuk5O4m7iPegSqgyaIVvN', kind: 'physical', max: 10, unitCents: 650 },
  oleo: { price: 'price_1UECv65O4m7iPegSVGK8qedO', kind: 'physical', max: 10, unitCents: 1200 },
  escalda: { price: 'price_1UEQLo5O4m7iPegS8BOzlT0P', kind: 'physical', max: 10, unitCents: 950 },
  vela: { price: 'price_1UEQLr5O4m7iPegSWWLhiNWP', kind: 'physical', max: 10, unitCents: 1400 },
  turista: { price: 'price_1UERKm5O4m7iPegSn9DuUULs', kind: 'digital', max: 1, unitCents: 299 },
  meandros: { price: 'price_1UERKp5O4m7iPegSCC05H2Kq', kind: 'digital', max: 1, unitCents: 499 }
};

const DELIVERY = {
  mainland: { min: 2, max: 4 },
  islands: { min: 4, max: 15 },
  eu_near: { min: 3, max: 7 },
  eu_west: { min: 4, max: 8 },
  eu_far: { min: 4, max: 10 },
  world_near: { min: 4, max: 10 },
  world_mid: { min: 5, max: 15 },
  world_far: { min: 7, max: 20 }
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
      const product = PRODUCTS[id];
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > product.max) continue;
      quantities.set(id, Math.min(product.max, (quantities.get(id) || 0) + quantity));
    }

    const items = [...quantities.entries()].map(([id, quantity]) => ({ id, quantity }));
    if (!items.length) return json({ error: 'O carrinho está vazio ou contém dados inválidos.' }, 400);

    const hasPhysical = items.some(item => PRODUCTS[item.id].kind === 'physical');
    const ebookIds = items.filter(item => PRODUCTS[item.id].kind === 'digital').map(item => item.id);
    const subtotalCents = items.reduce((sum, item) => sum + PRODUCTS[item.id].unitCents * item.quantity, 0);

    let shipping = null;
    if (hasPhysical) {
      shipping = calculateShipping({
        region: String(body?.shipping?.region || ''),
        countryCode: String(body?.shipping?.countryCode || ''),
        postalCode: String(body?.shipping?.postalCode || ''),
        weightG: Number(body?.shipping?.testWeightG),
        subtotalCents,
        containsBruma: items.some(item => item.id === 'bruma')
      });
      if (!shipping.ok) return json({ error: shipping.error }, 400);
    }

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', origin + '/checkout-sucesso.html?session_id={CHECKOUT_SESSION_ID}');
    params.set('cancel_url', origin + '/checkout-teste.html?cancelado=1');
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
    params.set('custom_text[submit][message]', 'Ao pagar, confirmas a compra e aceitas as [condições da MAISON JF®](https://maison-jf.com/informacao-legal.html), a [política de envios](https://maison-jf.com/envios.html) e a [política de devoluções](https://maison-jf.com/devolucoes.html). A fatura fiscal é emitida pela MAISON JF® separadamente.');
    params.set('payment_method_types[0]', 'card');
    params.set('payment_method_types[1]', 'mb_way');
    params.set('submit_type', 'pay');
    params.set('metadata[environment]', 'maison-jf-sandbox');
    params.set('metadata[source]', 'site-cart-test');
    params.set('metadata[has_physical]', hasPhysical ? '1' : '0');
    params.set('metadata[ebook_ids]', ebookIds.join(','));

    if (shipping) {
      shipping.allowedCountries.forEach((country, index) => {
        params.set(`shipping_address_collection[allowed_countries][${index}]`, country);
      });

      const estimate = DELIVERY[shipping.zone];
      params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shipping.shippingCents));
      params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'eur');
      params.set(
        'shipping_options[0][shipping_rate_data][display_name]',
        shipping.freeShipping ? `Envio rastreável · ${shipping.zoneLabel} · grátis` : `Envio rastreável · ${shipping.zoneLabel}`
      );
      if (estimate) {
        params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
        params.set('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', String(estimate.min));
        params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
        params.set('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', String(estimate.max));
      }

      params.set('metadata[shipping_zone]', shipping.zone);
      params.set('metadata[shipping_zone_label]', shipping.zoneLabel);
      params.set('metadata[shipping_country_code]', shipping.countryCode || '');
      params.set('metadata[shipping_weight_g]', String(shipping.weightG));
      params.set('metadata[shipping_cents]', String(shipping.shippingCents));
      params.set('metadata[shipping_free_threshold_cents]', String(shipping.freeThresholdCents));
    }

    items.forEach((item, index) => {
      const product = PRODUCTS[item.id];
      params.set(`line_items[${index}][price]`, product.price);
      params.set(`line_items[${index}][quantity]`, String(item.quantity));
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

    return json({
      url: session.url,
      shipping: shipping ? {
        zone: shipping.zone,
        zoneLabel: shipping.zoneLabel,
        shippingCents: shipping.shippingCents,
        freeThresholdCents: shipping.freeThresholdCents,
        freeShipping: shipping.freeShipping
      } : null
    });
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
