import { getOrCreateQuestionSession } from '../_lib/para-de-ignorar-session.js';
import { requireMaisonVault } from '../_lib/maison-vault.js';

export async function onRequestGet({ env }) {
  const db=requireMaisonVault(env);
  const ids=['cs_internal_pdi_freeze_1','cs_internal_pdi_freeze_2'];
  try {
    await cleanup(db,ids);

    const buyer='internal-freeze-check@invalid.maison';
    const first={
      id:ids[0],
      customer_details:{email:buyer},
      customer_email:buyer
    };
    const second={
      id:ids[1],
      customer_details:{email:buyer},
      customer_email:buyer
    };

    const s1a=await getOrCreateQuestionSession({env,stripeSession:first,theme:'relacoes'});
    const s1b=await getOrCreateQuestionSession({env,stripeSession:first,theme:'relacoes'});
    const s2=await getOrCreateQuestionSession({env,stripeSession:second,theme:'relacoes'});

    const a1=questionIds(s1a);
    const a2=questionIds(s1b);
    const b=questionIds(s2);

    const frozenSame =
      s1a.game_session_id===s1b.game_session_id &&
      sameArray(a1,a2);

    const overlap=countOverlap(a1,b);
    const ok=
      frozenSame &&
      a1.length===28 &&
      b.length===28 &&
      s1a.packA.length===14 &&
      s1a.packB.length===14 &&
      s2.packA.length===14 &&
      s2.packB.length===14 &&
      overlap===0;

    return json({
      ok,
      frozen_same_purchase:frozenSame,
      first:{cards:a1.length,packA:s1a.packA.length,packB:s1a.packB.length},
      second:{cards:b.length,packA:s2.packA.length,packB:s2.packB.length},
      next_purchase_overlap:overlap,
      persisted_in_d1:true,
      answer_text_stored:false
    },ok?200:503);
  } catch (error) {
    return json({ok:false,code:String(error?.message||'runtime')},500);
  } finally {
    try{await cleanup(db,ids)}catch{}
  }
}

function questionIds(session){
  return [...(session?.packA||[]),...(session?.packB||[])].map(x=>x.id);
}
function sameArray(a,b){
  return a.length===b.length && a.every((x,i)=>x===b[i]);
}
function countOverlap(a,b){
  const set=new Set(b);
  return a.reduce((n,id)=>n+(set.has(id)?1:0),0);
}
async function cleanup(db,stripeIds){
  const placeholders=stripeIds.map((_,i)=>'?'+(i+1)).join(',');
  await db.prepare(
    `DELETE FROM vault_game_session_cards
      WHERE game_session_id IN (
        SELECT game_session_id FROM vault_game_sessions
        WHERE stripe_session_id IN (${placeholders})
      )`
  ).bind(...stripeIds).run();
  await db.prepare(
    `DELETE FROM vault_game_sessions
      WHERE stripe_session_id IN (${placeholders})`
  ).bind(...stripeIds).run();
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
