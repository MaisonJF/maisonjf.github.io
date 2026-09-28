import { ORACLE_TERRITORIES } from '../_lib/oracle-territories.js';
import { requireMaisonVault } from '../_lib/maison-vault.js';
import { oracleRoleCoverageForLocale } from '../_lib/maison-localized-content.js';
import { normalizeMaisonLocale, stripeLocaleForMaison } from '../_lib/maison-locales.js';
import { localizeOracleLabel } from '../_lib/oracle-public-locales.js';

const TERRITORIES=Object.fromEntries(
  ORACLE_TERRITORIES.map(t=>[t.slug,{label:t.label,page:t.slug+'.html'}])
);

function publicPrefix(locale){
  return locale==='pt-BR'?'/pt-br':locale==='en'?'/en':locale==='es'?'/es':'';
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) return json({ error: 'O checkout está temporariamente indisponível.' }, 503);
    const requestOrigin = new URL(request.url).origin;
    const originHeader = request.headers.get('Origin');
    if (originHeader && new URL(originHeader).origin !== requestOrigin) return json({ error: 'Origem inválida.' }, 403);
    let body = {};
    try { body = await request.json(); } catch { return json({ error: 'Pedido inválido.' }, 400); }
    const theme=String(body?.theme||'');
    const territory=TERRITORIES[theme];
    if (!territory) return json({ error: 'Este território ainda não está disponível.' }, 400);
    const rawLocale=body?.locale??body?.lang??'pt-PT';
    const locale=normalizeMaisonLocale(rawLocale,{fallback:null});
    if(!locale)return json({error:'Idioma inválido.'},400);
    if(locale!=='pt-PT'){
      const db=requireMaisonVault(env);
      const coverage=await oracleRoleCoverageForLocale(db,theme,locale);
      if(!coverage.complete)return json({error:'Este território ainda não está disponível neste idioma.'},409);
    }

    const origin = new URL(request.url).origin;
    const successUrl = origin + '/oraculo/leitura.html?theme=' + encodeURIComponent(theme) + '&session_id={CHECKOUT_SESSION_ID}&locale=' + encodeURIComponent(locale);

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', origin + publicPrefix(locale) + '/oraculo/' + theme + '?checkout_cancelado=1');
    params.set('locale', stripeLocaleForMaison(locale));
    params.set('customer_creation', 'always');
    params.set('billing_address_collection', 'auto');
    params.set('line_items[0][price_data][currency]', 'eur');
    params.set('line_items[0][price_data][unit_amount]', '200');
    params.set('line_items[0][price_data][product_data][name]', 'Oráculo MAISON JF® | ' + localizeOracleLabel(territory.label,locale));
    const copy={
      'pt-PT':{description:'Uma abertura simbólica. Uma leitura.',legal:'Ao pagar, confirmas uma abertura do Oráculo MAISON JF® e aceitas as condições em maison-jf.com/informacao-legal.html.'},
      'pt-BR':{description:'Uma abertura simbólica. Uma leitura.',legal:'Ao pagar, você confirma uma abertura do Oráculo MAISON JF® e aceita as condições em maison-jf.com/informacao-legal.html.'},
      en:{description:'One symbolic opening. One reading.',legal:'By paying, you confirm one MAISON JF® Oracle reading and accept the terms at maison-jf.com/informacao-legal.html.'},
      es:{description:'Una apertura simbólica. Una lectura.',legal:'Al pagar, confirmas una lectura del Oráculo MAISON JF® y aceptas las condiciones en maison-jf.com/informacao-legal.html.'}
    }[locale];
    params.set('line_items[0][price_data][product_data][description]', copy.description);
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[environment]', 'maison-jf-live');
    params.set('metadata[source]', 'oracle-live');
    params.set('metadata[oracle_theme]', theme);
    params.set('metadata[oracle_locale]', locale);
    params.set('metadata[oracle_access]', 'single-reading');
    params.set('submit_type', 'pay');
    params.set('custom_text[submit][message]', copy.legal);

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:'POST',
      headers:{ Authorization:'Bearer ' + env.STRIPE_LIVE_SECRET_KEY, 'Content-Type':'application/x-www-form-urlencoded' },
      body:params
    });
    const session = await stripeResponse.json().catch(()=>({}));
    if (!stripeResponse.ok) return json({ error: session?.error?.message || 'Não foi possível abrir o checkout.' }, stripeResponse.status);
    if (!session?.livemode || !session?.url) return json({ error: 'A sessão de pagamento não ficou disponível em produção.' }, 502);
    return json({ url: session.url });
  } catch {
    return json({ error: 'Não foi possível preparar o checkout.' }, 500);
  }
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
