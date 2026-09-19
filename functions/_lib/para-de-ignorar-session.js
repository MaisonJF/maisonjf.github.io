import { composeQuestionSession } from './question-composer.js';
import {
  requireMaisonVault,
  pseudonymousBuyerKey,
  listActivePaidQuestions,
  listSeenQuestionIds,
  findGameSessionByStripe,
  createGameSession,
  readGameSession
} from './maison-vault.js';
import { vaultExperienceEngineReady } from './maison-vault-v2.js';
import { listActivePaidQuestionsV2 } from './question-vault-v2.js';

/*
Creates one stable 28-card paid session.
This module never receives or stores players' answer text.
Stripe payment validation belongs in the API route that calls this module.
*/
export async function getOrCreateQuestionSession({env,stripeSession,theme}={}){
  if(!stripeSession?.id)throw new Error('stripe_session_required');
  if(!theme)throw new Error('theme_required');

  const db=requireMaisonVault(env);
  const existing=await findGameSessionByStripe(db,stripeSession.id);
  if(existing){
    if(existing.theme!==theme)throw new Error('session_theme_mismatch');
    return await readGameSession(db,existing.game_session_id);
  }

  const email=String(stripeSession.customer_details?.email||stripeSession.customer_email||'');
  const buyerKey=await pseudonymousBuyerKey({
    env,email,stripeSessionId:stripeSession.id
  });

  const useV2=await vaultExperienceEngineReady(db);
  const [questions,seenIds]=await Promise.all([
    useV2?listActivePaidQuestionsV2(db,theme):listActivePaidQuestions(db,theme),
    listSeenQuestionIds(db,buyerKey,theme)
  ]);

  const seed=await stableSeed('pdi-v2|'+theme+'|'+stripeSession.id);
  const composed=composeQuestionSession({
    theme,
    seed,
    questions,
    seenIds
  });

  const gameSessionId='pdi_'+crypto.randomUUID().replace(/-/g,'');
  await createGameSession(db,{
    gameSessionId,
    stripeSessionId:stripeSession.id,
    buyerKey,
    theme,
    seed,
    engineVersion:composed.engineVersion,
    packA:composed.packA,
    packB:composed.packB
  });
  return await readGameSession(db,gameSessionId);
}

async function stableSeed(input){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}
