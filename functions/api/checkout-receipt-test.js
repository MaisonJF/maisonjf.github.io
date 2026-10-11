// BRAZIL_MARKET_FULFILLMENT_EXEMPT: sandbox receipt handler for test-only Stripe payments; it does not grant production digital content access.
export async function onRequestPost({ request, env }) {
  try {
    const stripeSecret = String(env.STRIPE_SECRET_KEY || '');
    if (!/^(?:sk|rk)_test_/.test(stripeSecret)) {
      return json({ error: 'O recibo de teste exige uma chave Stripe em modo de teste.' }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Pedido inválido.' }, 400);
    }

    const sessionId = String(body?.session_id || '');
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error: 'Sessão inválida.' }, 400);
    }

    const sessionResponse = await stripeGet(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      env.STRIPE_SECRET_KEY
    );
    const session = await sessionResponse.json().catch(() => ({}));

    if (!sessionResponse.ok) {
      return json({ error: 'Não foi possível confirmar a sessão.' }, sessionResponse.status);
    }
    if (session.livemode !== false || session.metadata?.environment !== 'maison-jf-sandbox') {
      return json({ error: 'Esta rota só aceita sessões de teste da MAISON JF®.' }, 403);
    }
    if (session.payment_status !== 'paid') {
      return json({ error: 'O pagamento ainda não está confirmado.' }, 409);
    }

    const email = session.customer_details?.email;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!email || !paymentIntentId) {
      return json({ error: 'Faltam dados para preparar o recibo.' }, 422);
    }

    const paymentResponse = await stripeGet(
      'https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(paymentIntentId),
      env.STRIPE_SECRET_KEY
    );
    const paymentIntent = await paymentResponse.json().catch(() => ({}));

    if (!paymentResponse.ok) {
      return json({ error: 'Não foi possível verificar o recibo do pagamento.' }, paymentResponse.status);
    }

    if (paymentIntent.receipt_email === email) {
      return json({ ok: true, status: 'already_set', environment: session.livemode ? 'live' : 'test' });
    }

    const params = new URLSearchParams();
    params.set('receipt_email', email);
    const updateResponse = await fetch(
      'https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(paymentIntentId),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      }
    );
    const updated = await updateResponse.json().catch(() => ({}));

    if (!updateResponse.ok) {
      return json({ error: updated?.error?.message || 'Não foi possível preparar o recibo.' }, updateResponse.status);
    }

    return json({
      ok: true,
      status: 'receipt_email_set',
      environment: session.livemode ? 'live' : 'test'
    });
  } catch {
    return json({ error: 'Não foi possível preparar o recibo.' }, 500);
  }
}

function stripeGet(url, secret) {
  return fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
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
