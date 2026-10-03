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
