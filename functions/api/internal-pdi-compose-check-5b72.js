import { requireMaisonVault, listActivePaidQuestions } from '../_lib/maison-vault.js';
import { composeQuestionSession } from '../_lib/question-composer.js';

export async function onRequestGet({ env }) {
  try {
    const db=requireMaisonVault(env);
    const questions=await listActivePaidQuestions(db,'relacoes');

    const s1=composeQuestionSession({
      theme:'relacoes',
      seed:'compose-check-1',
      questions,
      seenIds:[]
    });
    const s2=composeQuestionSession({
      theme:'relacoes',
      seed:'compose-check-2',
      questions,
      seenIds:s1.ids
    });
    const s3=composeQuestionSession({
      theme:'relacoes',
      seed:'compose-check-3',
      questions,
      seenIds:[...s1.ids,...s2.ids]
    });

    const overlap12=countOverlap(s1.ids,s2.ids);
    const overlap13=countOverlap(s1.ids,s3.ids);
    const overlap23=countOverlap(s2.ids,s3.ids);

    const ok=
      questions.length===84 &&
      s1.ids.length===28 &&
      s2.ids.length===28 &&
      s3.ids.length===28 &&
      overlap12===0 &&
      overlap13===0 &&
      overlap23===0;

    return json({
      ok,
      repertoire:questions.length,
      engine:s1.engineVersion,
      sessions:[summary(s1),summary(s2),summary(s3)],
      overlaps:{s1_s2:overlap12,s1_s3:overlap13,s2_s3:overlap23}
    },ok?200:503);
  } catch (error) {
    return json({ok:false,code:String(error?.message||'runtime')},500);
  }
}

function summary(session){
  return {
    cards:session.ids.length,
    packA:session.packA.length,
    packB:session.packB.length,
    stages:countStages([...session.packA,...session.packB])
  };
}
function countStages(cards){
  const out={open:0,recognize:0,deepen:0,touch:0,close:0,signature:0};
  for(const card of cards)if(card.stage in out)out[card.stage]++;
  return out;
}
function countOverlap(a,b){
  const right=new Set(b);
  return a.reduce((n,id)=>n+(right.has(id)?1:0),0);
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
