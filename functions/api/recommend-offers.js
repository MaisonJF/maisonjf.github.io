import { recommendMaisonOffers, MAISON_OFFER_BRAIN } from '../_lib/offer-brain.js';

export async function onRequestPost({request}){
  try{
    const url=new URL(request.url);
    const origin=request.headers.get('Origin');
    if(origin && new URL(origin).origin!==url.origin)return json({error:'Origem não autorizada.'},403);

    const body=await request.json().catch(()=>({}));
    const result=recommendMaisonOffers({
      test:body?.test,
      testResult:body?.testResult,
      result:body?.result,
      ranked:body?.ranked,
      route:body?.route
    });
    return json(result,200);
  }catch{
    return json({error:'Não foi possível escolher as próximas portas.',version:MAISON_OFFER_BRAIN.version},500);
  }
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
