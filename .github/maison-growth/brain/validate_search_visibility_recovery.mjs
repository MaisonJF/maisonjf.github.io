import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const snapshot=JSON.parse(read('.github/maison-growth/brain/search-visibility-baseline.json'));
const discovery=buildPublicDiscovery();
const publicUrls=new Set(discovery.pages.map(page=>page.url));

function redirectMap(){
  const out=new Map();
  for(const raw of read('_redirects').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const parts=line.split(/\s+/);
    if(parts.length<3||parts[2]!=='301'||!parts[0].startsWith('/'))continue;
    out.set(parts[0],parts[1]);
  }
  return out;
}
function pathOf(url){
  const u=new URL(url);
  return u.pathname;
}

assert.equal(snapshot.schema,'maison.search-visibility.snapshot.v1');
assert.equal(snapshot.provider_id,'google_search_console');
assert.equal(snapshot.property,'sc-domain:maison-jf.com');
assert.equal(snapshot.sitemap.url,'https://maison-jf.com/sitemap.xml');
assert.equal(snapshot.sitemap.warnings,0);
assert.equal(snapshot.sitemap.errors,0);

const redirects=redirectMap();
const legacy=[];
for(const row of snapshot.pages){
  if(publicUrls.has(row.url))continue;
  legacy.push(row);
  const pathname=pathOf(row.url);
  assert(
    redirects.has(pathname),
    'Search Console legacy URL lacks explicit 301 recovery: '+pathname
  );
}

const legacyImpressions=legacy.reduce((sum,row)=>sum+Number(row.impressions||0),0);
const legacyClicks=legacy.reduce((sum,row)=>sum+Number(row.clicks||0),0);
assert(legacy.length>0,'expected legacy observations in baseline');
assert(legacyImpressions>0,'legacy recovery baseline should carry real impressions');

console.log(
  'MAISON search visibility recovery: OK · '+
  legacy.length+' legacy URLs · '+
  legacyImpressions+' observed impressions · '+
  legacyClicks+' clicks · all recovered by 301'
);
