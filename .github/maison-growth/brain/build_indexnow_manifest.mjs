import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const KEY='8f3d6a1b9c4e72f05a18d3c6b2e9471f';
const KEY_FILE='8f3d6a1b9c4e72f05a18d3c6b2e9471f.txt';
const OUTPUT=path.join(ROOT,'.github/maison-growth/brain/indexnow-manifest.generated.json');

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}

function sitemapRows(){
  const index=read('sitemap.xml');
  const children=[...index.matchAll(/<loc>(https:\/\/maison-jf\.com\/[^<]+\.xml)<\/loc>/g)]
    .map(m=>new URL(m[1]).pathname.slice(1));
  const rows=[];
  for(const child of children){
    const xml=read(child);
    for(const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)){
      const block=m[1];
      const url=(block.match(/<loc>([^<]+)<\/loc>/)||[])[1];
      const lastmod=(block.match(/<lastmod>([^<]+)<\/lastmod>/)||[])[1]||'';
      if(url)rows.push({url,lastmod,source:child});
    }
  }
  return rows;
}

function legacyRecoveryUrls(){
  const lines=read('_redirects').split(/\r?\n/);
  const out=[];
  let active=false;
  for(const raw of lines){
    const line=raw.trim();
    if(line==='# SEARCH-CONSOLE-LEGACY-RECOVERY — observed 2026-09-25'){active=true;continue}
    if(active&&line.startsWith('#'))break;
    if(!active||!line)continue;
    const parts=line.split(/\s+/);
    if(parts.length>=3&&parts[2]==='301'&&parts[0].startsWith('/')){
      out.push('https://maison-jf.com'+parts[0]);
    }
  }
  return out;
}

export function buildIndexNowManifest(){
  const rows=sitemapRows();
  const dates=rows.map(row=>row.lastmod).filter(Boolean).sort();
  const latest=dates.at(-1)||null;
  if(!latest)throw new Error('indexnow_lastmod_missing');
  const changed=rows.filter(row=>row.lastmod===latest).map(row=>row.url);
  const legacy=legacyRecoveryUrls();
  const urlList=[...new Set([...changed,...legacy])].sort();

  if(urlList.length>10000)throw new Error('indexnow_manifest_too_large');
  for(const raw of urlList){
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.hostname!=='maison-jf.com')throw new Error('indexnow_foreign_url:'+raw);
  }
  if(read(KEY_FILE).trim()!==KEY)throw new Error('indexnow_key_file_mismatch');

  return {
    schema_version:'maison_indexnow_manifest_v1',
    host:'maison-jf.com',
    key:KEY,
    keyLocation:'https://maison-jf.com/'+KEY_FILE,
    latest_lastmod:latest,
    current_changed_urls:changed.length,
    legacy_redirect_urls:legacy.length,
    url_count:urlList.length,
    urlList
  };
}

export function writeIndexNowManifest({check=false}={}){
  const out=JSON.stringify(buildIndexNowManifest(),null,2)+'\n';
  if(check){
    if(!fs.existsSync(OUTPUT)||fs.readFileSync(OUTPUT,'utf8')!==out){
      console.error('indexnow-manifest.generated.json is stale');
      return false;
    }
    console.log('MAISON IndexNow manifest: OK');
    return true;
  }
  fs.writeFileSync(OUTPUT,out);
  console.log('Wrote MAISON IndexNow manifest');
  return true;
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const ok=writeIndexNowManifest({check:process.argv.includes('--check')});
  if(!ok)process.exit(1);
}
