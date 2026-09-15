import { ORACLE_AMOR_READINGS } from '../_lib/oracle-amor.js';

export async function onRequestGet({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) {
      return json({ error:'O Oráculo está temporariamente indisponível.' },503);
    }

    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return json({ error:'Origem não autorizada.' },403);
    }

    const sessionId = String(url.searchParams.get('session_id') || '');
    if (!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ error:'Sessão inválida.' },400);
    }

    const stripeResponse = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      { headers:{ Authorization:'Bearer ' + env.STRIPE_LIVE_SECRET_KEY } }
    );
    const session = await stripeResponse.json().catch(() => ({}));

    if (!stripeResponse.ok) {
      return json({ error:'Não foi possível confirmar esta sessão.' },stripeResponse.status);
    }

    const valid =
      session.livemode === true &&
      session.payment_status === 'paid' &&
      session.metadata?.environment === 'maison-jf-live' &&
      session.metadata?.source === 'oracle-live' &&
      session.metadata?.oracle_theme === 'amor' &&
      session.metadata?.oracle_access === 'single-reading' &&
      session.amount_total === 200 &&
      session.currency === 'eur';

    if (!valid) {
      return json({ error:'Esta sessão não dá acesso a esta abertura.' },403);
    }

    if (!ORACLE_AMOR_READINGS.length) {
      return json({ error:'O Oráculo ficou temporariamente em silêncio.' },503);
    }

    const index = await readingIndex(sessionId, ORACLE_AMOR_READINGS.length);
    const reading = ORACLE_AMOR_READINGS[index];

    return json({
      paid:true,
      theme:'amor',
      session_id:session.id,
      reading:{ id:reading.id, title:reading.title, text:reading.text },
      amount_total:200,
      currency:'eur'
    });
  } catch {
    return json({ error:'Não foi possível abrir esta leitura.' },500);
  }
}

async function readingIndex(sessionId,length) {
  const input = new TextEncoder().encode('maison-jf-oracle-amor-v1|' + sessionId);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',input));
  const value = (
    ((digest[0] << 24) >>> 0) |
    (digest[1] << 16) |
    (digest[2] << 8) |
    digest[3]
  ) >>> 0;
  return value % length;
}

function json(payload,status=200) {
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}
