export async function onRequestGet({ request, env }) {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'Stripe não configurada neste ambiente.' }, 503);
    }

    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get('session_id') || '');
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error: 'Sessão inválida.' }, 400);
    }

    const response = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      }
    );

    const session = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ error: 'Não foi possível confirmar esta sessão.' }, response.status);
    }

    const nifField = Array.isArray(session.custom_fields)
      ? session.custom_fields.find(field => field?.key === 'nif')
      : null;

    return json({
      id: session.id,
      status: session.status || null,
      payment_status: session.payment_status || null,
      amount_total: Number.isInteger(session.amount_total) ? session.amount_total : null,
      currency: session.currency || 'eur',
      email: session.customer_details?.email || null,
      name: session.customer_details?.name || null,
      nif: nifField?.numeric?.value || nifField?.text?.value || null,
      environment: session.livemode ? 'live' : 'test'
    });
  } catch {
    return json({ error: 'Não foi possível verificar o checkout.' }, 500);
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
