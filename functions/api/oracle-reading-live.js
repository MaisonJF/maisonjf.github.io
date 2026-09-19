import { ORACLE_AMOR_READINGS } from '../_lib/oracle-amor.js';
import { ORACLE_TRABALHO_READINGS } from '../_lib/oracle-trabalho.js';
import { ORACLE_DINHEIRO_READINGS } from '../_lib/oracle-dinheiro.js';
import { ORACLE_FAMILIA_READINGS } from '../_lib/oracle-familia.js';
import { ORACLE_ESCOLHAS_READINGS } from '../_lib/oracle-escolhas.js';
import { ORACLE_PADROES_READINGS } from '../_lib/oracle-padroes.js';
import { ORACLE_TERRITORIES, buildTerritoryReadings } from '../_lib/oracle-territories.js';
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

const AUTHORED_READINGS={
  amor:ORACLE_AMOR_READINGS,
  trabalho:ORACLE_TRABALHO_READINGS,
  dinheiro:ORACLE_DINHEIRO_READINGS,
  familia:ORACLE_FAMILIA_READINGS,
  escolhas:ORACLE_ESCOLHAS_READINGS,
  padroes:ORACLE_PADROES_READINGS
};
const TERRITORIES=Object.fromEntries(ORACLE_TERRITORIES.map(t=>[t.slug,t]));

function readingsFor(theme){
  const territory=TERRITORIES[theme];
  if(!territory)return null;
  const readings=buildTerritoryReadings(territory);
  const authored=AUTHORED_READINGS[theme];
  if(!authored)return readings;
  return authored.concat(readings.slice(authored.length,28));
}

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
    const requestedTheme=String(url.searchParams.get('theme')||'');
    const theme=requestedTheme||sessionTheme;
    const readings=readingsFor(theme);

    const valid =
      !!readings &&
      session.livemode === true &&
      session.payment_status === 'paid' &&
      session.metadata?.environment === 'maison-jf-live' &&
      session.metadata?.source === 'oracle-live' &&
      sessionTheme === theme &&
      (!requestedTheme || requestedTheme === sessionTheme) &&
      session.metadata?.oracle_access === 'single-reading' &&
      session.amount_total === 200 &&
      session.currency === 'eur';

    if (!valid) return json({ error:'Esta sessão não dá acesso a esta abertura.' },403);

    const composed=await tryComposedReading({env,session,theme}).catch(()=>null);
    if(composed?.reading?.text){
      return json({
        paid:true,
        theme,
        session_id:session.id,
        reading:composed.reading,
        amount_total:200,
        currency:'eur'
      });
    }

    if (!readings.length) return json({ error:'O Oráculo ficou temporariamente em silêncio.' },503);
    const index = await readingIndex(theme, sessionId, readings.length);
    const selected = readings[index];

    return json({
      paid:true,
      theme,
      session_id:session.id,
      reading:{ id:selected.id, title:selected.title, text:selected.text },
      amount_total:200,
      currency:'eur'
    });
  } catch {
    return json({ error:'Não foi possível abrir esta leitura.' },500);
  }
}

async function tryComposedReading({env,session,theme}){
  const db=requireMaisonVault(env);
  if(!await vaultExperienceEngineReady(db))return null;

  const existing=await findOracleSessionByStripe(db,session.id);
  if(existing){
    if(existing.territory!==theme)return null;
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
    listActiveOracleBlocks(db,theme),
    listSeenOracleBlockIds(db,buyerKey,theme)
  ]);

  const needs=detectOracleContentNeeds({territory:theme,blocks});
  for(const need of needs)await upsertContentNeed(db,need);

  if(blocks.length<5)return null;

  // A global backbone may support an already-developed territory, but it must
  // never switch an untouched territory away from its authored legacy reading.
  const requiredRoles=['opening','recognition','tension','counterpoint','reframe','movement','close'];
  const specificRoles=new Set(blocks.filter(block=>block.territory===theme).map(block=>block.role));
  if(!requiredRoles.every(role=>specificRoles.has(role)))return null;

  const seed=await stableSeed('maison-jf-oracle-v3|'+theme+'|'+session.id);
  const composed=composeOracleReading({territory:theme,seed,blocks,seenIds});
  const oracleSessionId='orc_'+crypto.randomUUID().replace(/-/g,'');
  await createOracleSession(db,{
    oracleSessionId,
    stripeSessionId:session.id,
    buyerKey,
    composed
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
    });
  }
  return await readOracleSession(db,oracleSessionId);
}

async function stableSeed(input){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function readingIndex(theme,sessionId,length) {
  const input = new TextEncoder().encode('maison-jf-oracle-' + theme + '-v2|' + sessionId);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',input));
  const value = ((((digest[0] << 24) >>> 0) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0);
  return value % length;
}
function json(payload,status=200){return new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
