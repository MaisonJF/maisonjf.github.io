import { getOrCreateQuestionSession } from '../_lib/para-de-ignorar-session.js';

const THEMES={
  relacoes:{label:'Relações'}
};

export async function onRequestGet({ request, env }) {
  try {
    if (!env?.STRIPE_LIVE_SECRET_KEY) {
      return json({error:'Esta sessão está temporariamente indisponível.'},503);
    }

    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin){
      return json({error:'Origem não autorizada.'},403);
    }

    const sessionId=String(url.searchParams.get('session_id')||'');
    const requestedTheme=String(url.searchParams.get('theme')||'');
    if(!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)){
      return json({error:'Sessão inválida.'},400);
    }

    const stripeResponse=await fetch(
      'https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId),
      {headers:{Authorization:'Bearer '+env.STRIPE_LIVE_SECRET_KEY}}
    );
    const stripeSession=await stripeResponse.json().catch(()=>({}));
    if(!stripeResponse.ok){
      return json({error:'Não foi possível confirmar esta sessão.'},stripeResponse.status);
    }

    const theme=String(stripeSession.metadata?.pdi_theme||'');
    const valid=
      THEMES[theme] &&
      stripeSession.livemode===true &&
      stripeSession.payment_status==='paid' &&
      stripeSession.metadata?.environment==='maison-jf-live' &&
      stripeSession.metadata?.source==='para-de-ignorar-live' &&
      stripeSession.metadata?.pdi_access==='single-session' &&
      (!requestedTheme || requestedTheme===theme);

    if(!valid){
      return json({error:'Esta compra não dá acesso a esta sessão.'},403);
    }

    const frozen=await getOrCreateQuestionSession({
      env,
      stripeSession,
      theme
    });
    if(!frozen || frozen.packA?.length!==14 || frozen.packB?.length!==14){
      return json({error:'Não foi possível preparar esta sessão.'},503);
    }

    return json({
      paid:true,
      theme,
      label:THEMES[theme].label,
      session_id:stripeSession.id,
      game_session_id:frozen.game_session_id,
      packs:{
        A:frozen.packA.map(card=>({id:card.id,position:card.position,text:card.text})),
        B:frozen.packB.map(card=>({id:card.id,position:card.position,text:card.text}))
      }
    });
  } catch {
    return json({error:'Não foi possível abrir esta sessão.'},500);
  }
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'private, no-store, max-age=0',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'
    }
  });
}
