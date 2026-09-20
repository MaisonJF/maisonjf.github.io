import { listAvailablePdiThemes } from '../_lib/pdi-theme-catalogue.js';

export async function onRequestGet({env}){
  try{
    const themes=await listAvailablePdiThemes(env);
    return json({
      themes:themes.map(item=>({
        slug:item.slug,
        label:item.label,
        family:item.family,
        available:true,
        currency:'EUR',
        amount_cents:item.amount,
        display_price:formatEUR(item.amount)
      }))
    });
  }catch{
    return json({themes:[]},503);
  }
}

function formatEUR(cents){
  return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);
}
function json(payload,status=200){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}
