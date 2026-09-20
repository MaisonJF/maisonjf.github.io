import {requireMaisonVault} from '../_lib/maison-vault.js';
import {listActivePublicVpcQuestions} from '../_lib/vpc-public-question-vault.js';
import {composeVpcQuestionSet,VPC_QUESTION_ENGINE_VERSION} from '../_lib/vpc-question-engine.js';

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const test=String(url.searchParams.get('test')||'').trim();
  if(!test)return json({error:'test_required'},400);

  const seed=String(url.searchParams.get('seed')||crypto.randomUUID()).slice(0,120);
  let vaultQuestions=[];
  try{
    const db=requireMaisonVault(env);
    vaultQuestions=await listActivePublicVpcQuestions(db,test);
  }catch{
    vaultQuestions=[];
  }

  try{
    const payload=composeVpcQuestionSet({test,seed,vaultQuestions});
    return json(payload,200);
  }catch(error){
    return json({
      error:'vpc_question_engine_unavailable',
      version:VPC_QUESTION_ENGINE_VERSION,
      code:safeCode(error)
    },503);
  }
}

function safeCode(error){
  const value=String(error?.message||'engine_error');
  return /^[a-z0-9_:-]+$/i.test(value)?value:'engine_error';
}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store, max-age=0',
      'x-content-type-options':'nosniff',
      'referrer-policy':'same-origin'
    }
  });
}
