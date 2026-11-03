import { composeOracleReading } from '../_lib/oracle-composer.js';
import { requireMaisonVault, pseudonymousBuyerKey } from '../_lib/maison-vault.js';
import {
  vaultExperienceEngineReady,
  listActiveOracleBlocks,
  listSeenOracleBlockIds,
  findOracleSessionByStripe,
  createOracleSession,
  readOracleSession,
  recordOracleSessionReopenedV2,
  recordExperienceSignal,
  upsertContentNeed
} from '../_lib/maison-vault-v2.js';
import { detectOracleContentNeeds } from '../_lib/content-gap-detector.js';
import { normalizeMaisonLocale } from '../_lib/maison-locales.js';
import { brazilSessionEligibilityResponse } from '../_lib/brazil-market.js';

const TERRITORIES=Object.fromEntries(ORACLE_TERRITORIES.map(t=>[t.slug,t]));

export async function onRequestGet({ request, env }) {
  try {
    if (!env.STRIPE_LIVE_SECRET_KEY) return json({ error:'O Oráculo está temporariamente indisponível.' },503);
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error:'Origem não autorizada.' },403);

    const sessionId = String(url.searchParams.get('session_id') || '');
    if (!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)) return json({ error:'Sessão inválida.' },400);

    const stripeResponse = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      { headers:{ Authorization:'Bearer ' + env.STRIPE_LIVE_SECRET_KEY } }
    );
    const session = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok) return json({ error:'Não foi possível confirmar esta sessão.' },stripeResponse.status);

    const sessionTheme=String(session.metadata?.oracle_theme||'');
    const sessionLocale=normalizeMaisonLocale(session.metadata?.oracle_locale||'pt-PT');
    const requestedTheme=String(url.searchParams.get('theme')||'');
    const rawRequestedLocale=url.searchParams.get('locale')||url.searchParams.get('lang');
    const requestedLocale=rawRequestedLocale==null?null:normalizeMaisonLocale(rawRequestedLocale,{fallback:null});
    if(rawRequestedLocale!=null&&!requestedLocale)return json({error:'Idioma inválido.'},400);
    const theme=requestedTheme||sessionTheme;
    const locale=requestedLocale||sessionLocale;
    const expectedAmount=sessionLocale==='pt-BR'?990:200;
    const expectedCurrency=sessionLocale==='pt-BR'?'brl':'eur';
    const marketError=brazilSessionEligibilityResponse(session,sessionLocale,expectedAmount);
    if(marketError)return marketError;

    const valid =
      !!TERRITORIES[theme] &&
      session.livemode === true &&
      session.payment_status === 'paid' &&
      session.metadata?.environment === 'maison-jf-live' &&
      session.metadata?.source === 'oracle-live' &&
      sessionTheme === theme &&
      (!requestedTheme || requestedTheme === sessionTheme) &&
      locale===sessionLocale &&
      session.metadata?.oracle_access === 'single-reading' &&
      session.amount_total === expectedAmount &&
      session.currency === expectedCurrency;

    if (!valid) return json({ error:'Esta sessão não dá acesso a esta abertura.' },403);

    const composed=await tryComposedReading({env,session,theme,locale}).catch(()=>null);
    if(composed?.reading?.text){
      return json({
        paid:true,
        locale,
        session_id:session.id,
        reading:composed.reading,
        amount_total:expectedAmount,
        currency:expectedCurrency
      });
    }

    return json({error:'Esta leitura ainda não está disponível. O pagamento foi confirmado, mas o conteúdo não está pronto.',code:'oracle_content_unavailable'},503);
  } catch {
    return json({ error:'Não foi possível abrir esta leitura.' },500);
  }
}

async function tryComposedReading({env,session,theme,locale='pt-PT'}){
  const db=requireMaisonVault(env);
  if(!await vaultExperienceEngineReady(db))return null;

  const existing=await findOracleSessionByStripe(db,session.id);
  if(existing){
    if(existing.territory!==theme)return null;
    if(normalizeMaisonLocale(existing.locale||'pt-PT')!==normalizeMaisonLocale(locale))return null;
    await recordOracleSessionReopenedV2(db,{
      oracleSessionId:existing.oracle_session_id,
      buyerKey:existing.buyer_key,
      territory:existing.territory
    }).catch(()=>{});
    return await readOracleSession(db,existing.oracle_session_id);
  }

  const email=String(session.customer_details?.email||session.customer_email||'');
  const buyerKey=await pseudonymousBuyerKey({env,email,stripeSessionId:session.id});
  const [blocks,seenIds]=await Promise.all([
    listActiveOracleBlocks(db,theme,locale),
    listSeenOracleBlockIds(db,buyerKey,theme)
  ]);

  try{
    const needs=detectOracleContentNeeds({territory:theme,blocks});
    for(const need of needs)await upsertContentNeed(db,need);
  }catch{}

  if(blocks.length<7)return null;

  // A global backbone may support an already-developed territory, but it must
  // never switch an untouched territory away from its authored legacy reading.
  const requiredRoles=['opening','recognition','tension','counterpoint','reframe','movement','close'];
  const specificRoles=new Set(blocks.filter(block=>block.territory===theme).map(block=>block.role));
  if(!requiredRoles.every(role=>specificRoles.has(role)))return null;

  const seed=await stableSeed('maison-jf-oracle-v3|'+theme+'|'+session.id);
  const composed=composeOracleReading({territory:theme,seed,blocks,seenIds,locale});
  const oracleSessionId='orc_'+crypto.randomUUID().replace(/-/g,'');
  await createOracleSession(db,{
    oracleSessionId,
    stripeSessionId:session.id,
    buyerKey,
    composed,
    locale
  });
  if(seenIds.length){
    await recordExperienceSignal(db,{
      product:'oracle',
      eventType:'repurchased',
      contentType:'session',
      contentId:oracleSessionId,
      buyerKey,
      territory:theme,
      signalKey:['oracle','repurchased',oracleSessionId].join('|')
    }).catch(()=>{});
  }
  return await readOracleSession(db,oracleSessionId);
}

async function stableSeed(input){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
