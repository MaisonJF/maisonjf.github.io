import {
  MAISON_LANGUAGE_SWITCHER_CSS,
  hasLocalizedSiteCoverage,
  localeAlternates,
  localeSwitcherHtml,
  normalizePublicSitePath
} from './_lib/site-i18n.js';

const ORIGIN='https://maison-jf.com';
const SKIP_PREFIXES=[
  '/api/','/en/','/es/','/pt-br/',
  '/checkout-','/para-de-ignorar/admin-import',
  '/para-de-ignorar/preview-','/para-de-ignorar/relacoes-preview-'
];

function shouldSkip(pathname){
  const path=String(pathname||'/').toLowerCase();
  if(path==='/en'||path==='/es'||path==='/pt-br')return true;
  return SKIP_PREFIXES.some(prefix=>path.startsWith(prefix));
}

function htmlResponse(response){
  return /(?:^|;)\s*text\/html(?:;|$)/i.test(response.headers.get('content-type')||'');
}

function escapeHtml(value){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function alternatesMarkup(sourcePath){
  return localeAlternates(sourcePath,ORIGIN)
    .map(([lang,href])=>'<link rel="alternate" hreflang="'+lang+'" href="'+escapeHtml(href)+'">')
    .join('');
}

export async function onRequest(context){
  // Maintenance switch: keep the site reachable while preventing new sales.
  const maintenanceUrl=new URL(context.request.url);
  const maintenancePath=maintenanceUrl.pathname;
  // Stripe notifications must remain receivable even during maintenance.
  if(maintenancePath==='/api/stripe-webhook-live')return context.next();
  // Read-only health diagnostics remain available while the public site is closed.
  if(maintenancePath==='/api/engine-health' && (context.request.method==='GET' || context.request.method==='HEAD'))return context.next();
  const isApi=maintenancePath.startsWith('/api/');
  const isDocument=/\.(?:html?)$/i.test(maintenancePath)||!(/\.[a-z0-9]{1,8}$/i.test(maintenancePath));
  if(isApi || (context.request.method!=='GET' && context.request.method!=='HEAD')){
    return new Response(JSON.stringify({ok:false,error:'MAISON JF® em manutenção.'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','retry-after':'3600'}});
  }
  if(isDocument){
    const html='<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Em manutenção | MAISON JF®</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f0e7;color:#25221e;font-family:Arial,Helvetica,sans-serif;text-align:center;padding:28px}main{max-width:650px}small{letter-spacing:.3em;font-size:13px}h1{font-family:Georgia,serif;font-size:clamp(42px,9vw,86px);font-weight:400;margin:30px 0 18px}p{font-size:clamp(17px,3vw,21px);line-height:1.65;color:#625b51}.line{height:1px;width:80px;background:#ad9160;margin:35px auto}strong{font-size:13px;letter-spacing:.13em}</style></head><body><main><small>MAISON JF®</small><div class="line"></div><h1>Em manutenção.</h1><p>Estamos a preparar o regresso da nossa casa digital.<br>Voltamos em breve.</p><div class="line"></div><strong>PÁRA DE IGNORAR! VOLTA PARA CASA.</strong></main></body></html>';
    return new Response(context.request.method==='HEAD'?null:html,{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','retry-after':'3600','x-robots-tag':'noindex, nofollow'}});
  }
  if(context.request.method!=='GET')return context.next();
  const requestUrl=new URL(context.request.url);
  if(shouldSkip(requestUrl.pathname))return context.next();

  const response=await context.next();
  if(!htmlResponse(response))return response;

  const sourcePath=normalizePublicSitePath(requestUrl.pathname);
  if(!hasLocalizedSiteCoverage(sourcePath))return response;
  let html=await response.text();

  html=html.replace(/\s*<link\s+rel=(["'])alternate\1[^>]*hreflang=[^>]*>/gi,'');
  html=html.replace(
    /<\/head>/i,
    alternatesMarkup(sourcePath)+
    '<style id="maison-language-switcher-style">'+MAISON_LANGUAGE_SWITCHER_CSS+'</style>'+
    '<script>window.MAISON_LOCALE="pt-PT";window.MAISON_I18N_AVAILABLE=true;</script></head>'
  );
  if(!html.includes('class="maison-language-switcher"')){
    html=html.replace(/<body\b([^>]*)>/i,'<body$1>'+localeSwitcherHtml(sourcePath,'pt-PT'));
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-language','pt-PT');
  headers.set('x-maison-locale','pt-PT');

  return new Response(html,{
    status:response.status,
    statusText:response.statusText,
    headers
  });
}
