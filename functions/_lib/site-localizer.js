import {
  MAISON_SITE_LOCALES,
  MAISON_LANGUAGE_SWITCHER_CSS,
  hasLocalizedSiteCoverage,
  localizedAbsoluteUrl,
  localizedPath,
  localeAlternates,
  localeSwitcherHtml,
  normalizePublicSitePath,
  translateMaisonHtml
} from './site-i18n.js';

const ORIGIN='https://maison-jf.com';
const BLOCKED_PREFIXES=[
  '/api/','/sos/','/checkout-','/para-de-ignorar/admin-import',
  '/para-de-ignorar/preview-','/para-de-ignorar/relacoes-preview-'
];

function sourcePathFromLocalized(pathname,locale){
  const prefix=MAISON_SITE_LOCALES[locale]?.prefix||'';
  let path=String(pathname||'/');
  if(prefix&&path.startsWith(prefix))path=path.slice(prefix.length)||'/';
  return path.startsWith('/')?path:'/'+path;
}

function localizable(path){
  const clean=String(path||'/').toLowerCase();
  return !BLOCKED_PREFIXES.some(prefix=>clean.startsWith(prefix));
}

function escapeHtml(value){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function headLocaleMarkup(sourcePath,locale){
  const canonical=localizedAbsoluteUrl(sourcePath,locale,ORIGIN);
  const alternates=localeAlternates(sourcePath,ORIGIN)
    .map(([lang,href])=>'<link rel="alternate" hreflang="'+lang+'" href="'+escapeHtml(href)+'">')
    .join('');
  const config=MAISON_SITE_LOCALES[locale];
  return [
    '<link rel="canonical" href="'+escapeHtml(canonical)+'">',
    alternates,
    '<meta property="og:locale" content="'+config.ogLocale+'">',
    '<style id="maison-language-switcher-style">'+MAISON_LANGUAGE_SWITCHER_CSS+'</style>',
    '<script>window.MAISON_LOCALE='+JSON.stringify(locale)+';window.MAISON_I18N_AVAILABLE=true;</script>'
  ].join('');
}

function rewriteMetadata(html,sourcePath,locale){
  const config=MAISON_SITE_LOCALES[locale];
  let out=String(html);
  out=out.replace(/<html\b([^>]*)\blang=(["'])[^"']*\2([^>]*)>/i,'<html$1lang="'+config.htmlLang+'"$3>');
  if(!/<html\b[^>]*\blang=/i.test(out))out=out.replace(/<html\b([^>]*)>/i,'<html$1 lang="'+config.htmlLang+'">');

  out=out.replace(/\s*<link\s+rel=(["'])canonical\1[^>]*>/gi,'');
  out=out.replace(/\s*<link\s+rel=(["'])alternate\1[^>]*hreflang=[^>]*>/gi,'');
  out=out.replace(/\s*<meta\s+property=(["'])og:locale\1[^>]*>/gi,'');
  out=out.replace(/"inLanguage"\s*:\s*"pt-PT"/g,'"inLanguage":"'+config.htmlLang+'"');

  const canonicalPt=localizedAbsoluteUrl(sourcePath,'pt-PT',ORIGIN);
  const canonicalLocalized=localizedAbsoluteUrl(sourcePath,locale,ORIGIN);
  out=out.split(canonicalPt).join(canonicalLocalized);

  out=out.replace(/<\/head>/i,headLocaleMarkup(sourcePath,locale)+'</head>');
  const switcher=localeSwitcherHtml(sourcePath,locale);
  out=out.replace(/<body\b([^>]*)>/i,'<body$1>'+switcher);
  return out;
}

function isAssetLike(pathname){
  return /\.(?:css|js|mjs|json|xml|txt|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|pdf|mp4|webm)$/i.test(pathname);
}

function stripLocaleFromAssetUrl(value,sourcePath,locale){
  if(!value||value.startsWith('data:')||value.startsWith('blob:'))return value;
  try{
    const base=new URL(sourcePath,ORIGIN);
    const resolved=new URL(value,base);
    if(resolved.origin!==ORIGIN)return value;
    return resolved.pathname+resolved.search+resolved.hash;
  }catch(_){
    return value;
  }
}

function localizeAnchorUrl(value,sourcePath,locale){
  if(!value||value.startsWith('#')||/^(?:mailto:|tel:|javascript:)/i.test(value))return value;
  try{
    const base=new URL(sourcePath,ORIGIN);
    const resolved=new URL(value,base);
    if(resolved.origin!==ORIGIN)return value;
    if(resolved.pathname.startsWith('/api/'))return resolved.pathname+resolved.search+resolved.hash;
    return localizedPath(resolved.pathname,locale)+resolved.search+resolved.hash;
  }catch(_){
    return value;
  }
}

class AssetHandler{
  constructor(attr,sourcePath,locale){this.attr=attr;this.sourcePath=sourcePath;this.locale=locale}
  element(el){
    const value=el.getAttribute(this.attr);
    const next=stripLocaleFromAssetUrl(value,this.sourcePath,this.locale);
    if(next&&next!==value)el.setAttribute(this.attr,next);
  }
}

class LinkHandler{
  constructor(sourcePath,locale){this.sourcePath=sourcePath;this.locale=locale}
  element(el){
    const value=el.getAttribute('href');
    const next=localizeAnchorUrl(value,this.sourcePath,this.locale);
    if(next&&next!==value)el.setAttribute('href',next);
  }
}

class FormHandler{
  constructor(sourcePath,locale){this.sourcePath=sourcePath;this.locale=locale}
  element(el){
    const value=el.getAttribute('action');
    const next=localizeAnchorUrl(value,this.sourcePath,this.locale);
    if(next&&next!==value)el.setAttribute('action',next);
  }
}

export async function serveLocalizedPage(context,locale){
  if(!MAISON_SITE_LOCALES[locale]||locale==='pt-PT')return context.next();

  const incoming=new URL(context.request.url);
  const sourcePath=sourcePathFromLocalized(incoming.pathname,locale);
  if(!localizable(sourcePath)||!hasLocalizedSiteCoverage(sourcePath))return new Response('Not found',{status:404});

  const sourceUrl=new URL(sourcePath+incoming.search,ORIGIN);
  let response=await context.env.ASSETS.fetch(new Request(sourceUrl.toString(),{
    method:context.request.method,
    headers:context.request.headers
  }));

  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('text/html')){
    return response;
  }

  const sourceCanonicalPath=normalizePublicSitePath(sourcePath);
  let html=await response.text();
  html=translateMaisonHtml(html,locale,sourceCanonicalPath);
  html=rewriteMetadata(html,sourceCanonicalPath,locale);

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-language',MAISON_SITE_LOCALES[locale].htmlLang);
  headers.set('x-maison-locale',locale);
  headers.set('cache-control','public, max-age=300, s-maxage=900');

  response=new Response(html,{status:response.status,statusText:response.statusText,headers});
  return new HTMLRewriter()
    .on('a[href]',new LinkHandler(sourceCanonicalPath,locale))
    .on('form[action]',new FormHandler(sourceCanonicalPath,locale))
    .on('script[src]',new AssetHandler('src',sourceCanonicalPath,locale))
    .on('img[src]',new AssetHandler('src',sourceCanonicalPath,locale))
    .on('source[src]',new AssetHandler('src',sourceCanonicalPath,locale))
    .on('link[rel="stylesheet"][href]',new AssetHandler('href',sourceCanonicalPath,locale))
    .on('link[rel="preload"][href]',new AssetHandler('href',sourceCanonicalPath,locale))
    .on('link[rel="icon"][href]',new AssetHandler('href',sourceCanonicalPath,locale))
    .transform(response);
}
