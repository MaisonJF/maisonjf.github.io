import { listAvailablePdiThemes } from '../_lib/pdi-theme-catalogue.js';
import { normalizeMaisonLocale } from '../_lib/maison-locales.js';

export async function onRequestGet({request,env}){
  try{
    const url=new URL(request.url);
    const rawLocale=url.searchParams.get('locale')||url.searchParams.get('lang')||'pt-PT';
    const locale=normalizeMaisonLocale(rawLocale,{fallback:null});
    if(!locale)return json({themes:[],error:'invalid_locale'},400);
    const themes=await listAvailablePdiThemes(env,locale);
    return json({
      themes:themes.map(item=>({
        slug:item.slug,
        label:item.label,
        family:item.family,
        available:true,
        currency:'EUR',
        amount_cents:item.amount,
        display_price:formatEUR(item.amount,locale)
      })),
      locale
    });
  }catch{
    return json({themes:[]},503);
  }
}

function formatEUR(cents,locale='pt-PT'){
  const value=Number(cents||0)/100;
  const whole=Number.isInteger(value);
  const intlLocale=locale==='pt-PT'?'pt-PT':locale==='es'?'es-ES':'en-IE';
  return new Intl.NumberFormat(intlLocale,{
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
      'cache-control':status===200
        ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
        : 'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}
