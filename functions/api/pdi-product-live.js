import { pdiThemeAvailability } from '../_lib/pdi-theme-catalogue.js';

export async function onRequestGet({request,env}){
  try{
    const url=new URL(request.url);
    const theme=String(url.searchParams.get('theme')||'relacoes');
    const product=await pdiThemeAvailability(env,theme);
    if(!product)return json({available:false},404);

    return json({
      theme:product.slug,
      name:'PÁRA DE IGNORAR! · '+product.label,
      label:product.label,
      family:product.family,
      currency:String(product.currency||'eur').toUpperCase(),
      available:product.available,
      amount_cents:product.available?product.amount:null,
      display_price:product.available?formatEUR(product.amount):null
    },product.available?200:409);
  }catch{
    return json({available:false,error:'Produto temporariamente indisponível.'},503);
  }
}

function formatEUR(cents){
  const value=Number(cents||0)/100;
  const whole=Number.isInteger(value);
  return new Intl.NumberFormat('pt-PT',{
    style:'currency',
    currency:'EUR',
    minimumFractionDigits:whole?0:2,
    maximumFractionDigits:whole?0:2
  }).format(value);
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
