#!/usr/bin/env node
// MAISON JF® 3.0: conservative static route and localization smoke checks.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const pages=['index.html','produtos/index.html'];
let errors=[];
for(const page of pages){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 const links=[...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
 const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]));
 for(const href of links){if(href.startsWith('#')&&href.length>1&&!ids.has(href.slice(1)))errors.push(page+': missing anchor '+href);}

 for(const href of links){
  if(/^(?:#|https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(href))continue;
  if(href.includes('${'))continue; // template expressions are runtime paths
  const clean=href.split(/[?#]/)[0];
  if(!clean||/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?)$/i.test(clean))continue;
  const resolved=path.resolve(path.dirname(path.join(root,page)),decodeURIComponent(clean));
  if(!resolved.startsWith(root+path.sep)&&resolved!==root){errors.push(page+': path escapes root: '+href);continue;}
  if(!fs.existsSync(resolved)&&!fs.existsSync(resolved+'.html')&&!fs.existsSync(path.join(resolved,'index.html'))){
   errors.push(page+': missing local destination '+href);
  }
 }
}
const i18n=fs.readFileSync(path.join(root,'functions/_lib/site-i18n.js'),'utf8');
for(const locale of ['pt-PT','pt-BR','en','es'])if(!i18n.includes(locale))errors.push('i18n missing '+locale);
if(errors.length){console.error('3.0 smoke check FAILED\n'+errors.join('\n'));process.exitCode=1;}
else console.log('3.0 smoke check passed: local navigation + 4 locales');
