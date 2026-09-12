export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) {
      return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }

    const sessionId = String(body?.session_id || '');
    if (!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error: 'Sessão inválida.' }, 400);
    }

    const sessionResponse = await stripeGet(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      env.STRIPE_LIVE_SECRET_KEY
    );
    const session = await sessionResponse.json().catch(() => ({}));

    if (!sessionResponse.ok) {
      return json({ error: 'Não foi possível confirmar a sessão.' }, sessionResponse.status);
    }
    if (!session.livemode || session.metadata?.environment !== 'maison-jf-live') {
      return json({ error: 'Sessão de produção inválida.' }, 403);
    }
    if (session.payment_status !== 'paid') {
      return json({ error: 'O pagamento ainda não está confirmado.' }, 409);
    }

    const email = session.customer_details?.email;
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!email || !paymentIntentId) {
      return json({ error: 'Faltam dados para preparar o recibo.' }, 422);
    }

    const paymentResponse = await stripeGet(
      'https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(paymentIntentId),
      env.STRIPE_LIVE_SECRET_KEY
    );
    const paymentIntent = await paymentResponse.json().catch(() => ({}));

    if (!paymentResponse.ok) {
      return json({ error: 'Não foi possível verificar o recibo.' }, paymentResponse.status);
    }

    if (paymentIntent.receipt_email === email) {
      return json({ ok: true, status: 'already_set', environment: 'live' });
    }

    const params = new URLSearchParams();
    params.set('receipt_email', email);

    const updateResponse = await fetch(
      'https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(paymentIntentId),
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.STRIPE_LIVE_SECRET_KEY,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      }
    );

    const updated = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok) {
      return json({ error: updated?.error?.message || 'Não foi possível preparar o recibo.' }, updateResponse.status);
    }

    return json({ ok: true, status: 'receipt_email_set', environment: 'live' });
  } catch {
    return json({ error: 'Não foi possível preparar o recibo.' }, 500);
  }
}

function stripeGet(url, secret) {
  return fetch(url, { headers: { Authorization: 'Bearer ' + secret } });
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
