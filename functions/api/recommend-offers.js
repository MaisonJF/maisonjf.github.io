import { recommendMaisonOffers, MAISON_OFFER_BRAIN } from '../_lib/offer-brain.js';

export async function onRequestPost({request,env}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin)return json({error:'Origem não autorizada.'},403);

    const body=await request.json().catch(()=>({}));
    const signal={
      test:body?.test,
      testResult:body?.testResult,
      result:body?.result,
      ranked:body?.ranked,
      route:body?.route
    };
    const learning=await loadOfferLearning(env?.GROWTH_DB,signal);
    const result=recommendMaisonOffers(signal,learning);
    return json(result,200);
  }catch{
    return json({error:'Não foi possível escolher as próximas portas.',version:MAISON_OFFER_BRAIN.version},500);
  }
}

async function loadOfferLearning(db,signal){
  if(!db)return {};
  try{
    const rows=await db.prepare(
      `SELECT subject_id,confidence_delta,observed_json,evidence_refs_json,created_at
       FROM learning_records
       WHERE subject_type='candidate' AND signal_class IN ('positive','negative','neutral')
       ORDER BY created_at DESC LIMIT 250`
    ).all();
    const out={};
    for(const row of rows?.results||[]){
      let refs=[];let observed={};
      try{refs=JSON.parse(row.evidence_refs_json||'[]')}catch{}
      try{observed=JSON.parse(row.observed_json||'{}')}catch{}
      const prefix='offer:';
      const ref=refs.find(x=>String(x).startsWith(prefix));
      if(!ref)continue;
      const offerId=String(ref).slice(prefix.length).split(':')[0];
      if(!offerId||out[offerId])continue;
      // Context is encoded in evidence refs by A11. Reject records whose route
      // conflicts with the current request; generic records remain eligible.
      const route=String(signal?.route||'');
      if(route && refs.some(x=>String(x).includes(':route:')) && !refs.some(x=>String(x).includes(':route:'+route)))continue;
      out[offerId]={confidence_delta:Number(row.confidence_delta||0),observation_count:Number(observed.observation_count||0)};
    }
    return out;
  }catch{return {};}
}

export async function onRequestGet(){
  return json({version:MAISON_OFFER_BRAIN.version,status:'ready'},200);
}

function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
      'referrer-policy':'same-origin'
    }
  });
}
