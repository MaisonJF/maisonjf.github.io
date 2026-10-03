import {requireMaisonVault} from '../_lib/maison-vault.js';
import {listActivePublicVpcQuestions,listLocalizedPublicVpcSet} from '../_lib/vpc-public-question-vault.js';
import {composeVpcQuestionSet,VPC_QUESTION_ENGINE_VERSION} from '../_lib/vpc-question-engine.js';

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const test=String(url.searchParams.get('test')||'').trim();
  if(!test)return json({error:'test_required'},400);

  const seed=String(url.searchParams.get('seed')||crypto.randomUUID()).slice(0,120);
  const locale=String(url.searchParams.get('locale')||'pt-PT').trim();
  let vaultQuestions=[];
  try{
    const db=requireMaisonVault(env);
    if(locale&&locale!=='pt-PT'&&locale!=='pt'){
      const localized=await listLocalizedPublicVpcSet(db,test,locale,seed);
      if(!localized)return json({error:'vpc_locale_not_ready',locale},503);
      return json({
        version:VPC_QUESTION_ENGINE_VERSION,
        test,seed,locale,
        questionCount:localized.questions.length,
        questions:localized.questions,
        routeQuestions:localized.routeQuestions
      },200);
    }
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
