const EBOOKS = {
  turista: {
    key: 'ebooks/virgulas-do-destino-o-turista.pdf',
    filename: 'Virgulas-do-Destino-O-Turista.pdf'
  },
  meandros: {
    key: 'ebooks/virgulas-do-destino-meandros-da-vida.pdf',
    filename: 'Virgulas-do-Destino-Meandros-da-Vida.pdf'
  }
};

const ACCESS_SECONDS = 7 * 24 * 60 * 60;

export async function onRequestGet({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) {
      return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    }
    if (!env.EBOOKS) {
      return json({ error: 'O armazenamento privado dos ebooks não está disponível.' }, 503);
    }

    const url = new URL(request.url);
    const sessionId = String(url.searchParams.get('session_id') || '');
    const ebookId = String(url.searchParams.get('ebook') || '');
    const ebook = EBOOKS[ebookId];

    if (!/^cs_live_[A-Za-z0-9]+$/.test(sessionId) || !ebook) {
      return json({ error: 'Pedido de download inválido.' }, 400);
    }

    const stripeResponse = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      { headers: { Authorization: 'Bearer ' + env.STRIPE_LIVE_SECRET_KEY } }
    );
    const session = await stripeResponse.json().catch(() => ({}));

    if (!stripeResponse.ok || !session.livemode || session.metadata?.environment !== 'maison-jf-live') {
      return json({ error: 'Sessão de compra inválida.' }, 403);
    }
    if (session.payment_status !== 'paid') {
      return json({ error: 'Não existe um pagamento confirmado para este download.' }, 403);
    }

    const bought = String(session.metadata?.ebook_ids || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);

    if (!bought.includes(ebookId)) {
      return json({ error: 'Este ebook não pertence a esta compra.' }, 403);
    }

    const created = Number(session.created || 0);
    const now = Math.floor(Date.now() / 1000);
    if (!created || now - created > ACCESS_SECONDS) {
      return json({ error: 'O acesso automático expirou. Contacta a MAISON JF® para receberes um novo acesso.' }, 410);
    }

    const object = await env.EBOOKS.get(ebook.key);
    if (!object) {
      return json({ error: 'O ficheiro não está disponível no armazenamento privado.' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('content-type', 'application/pdf');
    headers.set('content-disposition', 'attachment; filename="' + ebook.filename + '"');
    headers.set('cache-control', 'private, no-store, max-age=0');
    headers.set('x-content-type-options', 'nosniff');
    return new Response(object.body, { headers });
  } catch {
    return json({ error: 'Não foi possível preparar o download.' }, 500);
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
