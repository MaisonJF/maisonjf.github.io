export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return json({ ok:false, code:'origin' },403);
    }

    if (!env?.MAISON_BRAIN_DB || typeof env.MAISON_BRAIN_DB.prepare !== 'function') {
      return json({ ok:false, code:'db_binding' },503);
    }
    if (!env?.MAISON_VAULT_PEPPER) {
      return json({ ok:false, code:'pepper' },503);
    }

    const row = await env.MAISON_BRAIN_DB.prepare(
      "SELECT COUNT(*) AS n FROM vault_questions WHERE question_id='q_rel_test_001'"
    ).first();

    if (Number(row?.n||0) !== 1) {
      return json({ ok:false, code:'vault_read' },503);
    }

    return json({ ok:true });
  } catch {
    return json({ ok:false, code:'runtime' },500);
  }
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}
