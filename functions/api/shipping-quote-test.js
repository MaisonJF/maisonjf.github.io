import { calculateShipping } from '../_lib/shipping-test.js';

const PRICES = {
  bruma: 650,
  oleo: 1200,
  escalda: 950,
  vela: 1400,
  turista: 299,
  meandros: 499
};

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const requested = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];

    let subtotalCents = 0;
    let containsBruma = false;
    let hasPhysical = false;

    for (const item of requested) {
      const id = String(item?.id || '');
      const quantity = Number(item?.quantity);
      if (!(id in PRICES) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) continue;
      subtotalCents += PRICES[id] * quantity;
      if (id === 'bruma') containsBruma = true;
      if (['bruma','oleo','escalda','vela'].includes(id)) hasPhysical = true;
    }

    if (!hasPhysical) {
      return json({ ok: true, digitalOnly: true, shippingCents: 0, freeShipping: true });
    }

    const quote = calculateShipping({
      region: String(body?.shipping?.region || ''),
      countryCode: String(body?.shipping?.countryCode || ''),
      postalCode: String(body?.shipping?.postalCode || ''),
      weightG: Number(body?.shipping?.testWeightG),
      subtotalCents,
      containsBruma
    });

    return json(quote, quote.ok ? 200 : 400);
  } catch {
    return json({ ok: false, error: 'Não foi possível calcular os portes de teste.' }, 400);
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
