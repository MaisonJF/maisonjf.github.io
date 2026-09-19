import { requireMaisonVault, findGameSessionByStripe } from '../_lib/maison-vault.js';
import {
  vaultExperienceEngineReady,
  recordQuestionInteractionV2,
  markQuestionSessionCompletedV2
} from '../_lib/maison-vault-v2.js';

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin){
      return json({ok:false,error:'Origem não autorizada.'},403);
    }

    const body=await request.json().catch(()=>({}));
    const sessionId=String(body?.session_id||'');
    const gameSessionId=String(body?.game_session_id||'');
    const event=String(body?.event||'');
    const questionId=String(body?.question_id||'');

    if(!/^cs_live_[A-Za-z0-9]+$/.test(sessionId)||
       !/^pdi_[a-f0-9]+$/i.test(gameSessionId)||
       !['advanced','passed','completed'].includes(event)){
      return json({ok:false,error:'Evento inválido.'},400);
    }

    const db=requireMaisonVault(env);
    if(!await vaultExperienceEngineReady(db)){
      return json({ok:true,ignored:true});
    }

    const session=await findGameSessionByStripe(db,sessionId);
    if(!session||session.game_session_id!==gameSessionId){
      return json({ok:false,error:'Sessão inválida.'},403);
    }

    if(event==='completed'){
      await markQuestionSessionCompletedV2(db,{
        gameSessionId,
        buyerKey:session.buyer_key,
        theme:session.theme
      });
      return json({ok:true});
    }

    if(!/^q_[a-z0-9_-]+$/i.test(questionId)){
      return json({ok:false,error:'Pergunta inválida.'},400);
    }
    const membership=await db.prepare(
      `SELECT 1 AS ok
         FROM vault_game_session_cards
        WHERE game_session_id=?1 AND question_id=?2
        LIMIT 1`
    ).bind(gameSessionId,questionId).first();
    if(!membership?.ok){
      return json({ok:false,error:'Pergunta fora da sessão.'},403);
    }

    await recordQuestionInteractionV2(db,{
      gameSessionId,
      buyerKey:session.buyer_key,
      theme:session.theme,
      questionId,
      eventType:event
    });
    return json({ok:true});
  }catch{
    return json({ok:false,error:'Não foi possível registar o evento.'},500);
  }
}

export async function onRequestGet(){
  return json({ok:false,error:'Método não permitido.'},405);
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
