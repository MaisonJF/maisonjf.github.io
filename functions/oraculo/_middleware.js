import {applyMaisonPublicStructuredData} from '../_lib/public-structured-data-middleware.js';

// The 3.0 Oracle has one public entry point. Former theme-specific sales pages
// must never present a choice that the live checkout no longer honours.
// Preserve the entry point and reading callbacks, including legacy paid links.
const RETAINED=new Set([
  '/oraculo/','/oraculo','/oraculo/index.html',
  '/oraculo/leitura/','/oraculo/leitura',
  '/oraculo/amor-leitura','/oraculo/amor-leitura.html'
]);
export function onRequest(context){
  const request=context.request;
  const pathname=new URL(request.url).pathname;
  if((request.method==='GET'||request.method==='HEAD')&&
     /^\/oraculo\/[a-z0-9-]+(?:\.html)?\/?$/i.test(pathname)&&
     !RETAINED.has(pathname)){
    return Response.redirect(new URL('/oraculo/',request.url),301);
  }
  return applyMaisonPublicStructuredData(context);
}
