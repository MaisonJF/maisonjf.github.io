import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPublicDiscovery} from './build_public_discovery.mjs';

const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const OUTPUT=path.join(ROOT,'.github/maison-growth/brain/search-visibility.generated.json');
const SNAPSHOT=path.join(ROOT,'.github/maison-growth/brain/search-visibility-baseline.json');

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}

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

function redirectTarget(url,map){
  const u=new URL(url);
  return map.get(u.pathname)||null;
}

export function buildSearchVisibility(){
  const snapshot=JSON.parse(fs.readFileSync(SNAPSHOT,'utf8'));
  if(snapshot.schema!=='maison.search-visibility.snapshot.v1'){
    throw new Error('unsupported_search_visibility_snapshot');
  }

  const publicDiscovery=buildPublicDiscovery();
  const publicUrls=new Set(publicDiscovery.pages.map(page=>page.url));
  const redirects=redirectMap();

  const pages=snapshot.pages.map(row=>{
    const state=publicUrls.has(row.url)?'current_public':'legacy_observed';
    const redirect_to=state==='legacy_observed'?redirectTarget(row.url,redirects):null;
    return {
      url:row.url,
      state,
      redirect_to,
      clicks:Number(row.clicks||0),
      impressions:Number(row.impressions||0),
      ctr:Number(row.ctr||0),
      position:Number(row.position||0)
    };
  });

  const current=pages.filter(row=>row.state==='current_public');
  const legacy=pages.filter(row=>row.state==='legacy_observed');
  const recovered=legacy.filter(row=>row.redirect_to);
  const unrecovered=legacy.filter(row=>!row.redirect_to);
  const sum=(rows,key)=>rows.reduce((total,row)=>total+Number(row[key]||0),0);

  const searchAppearance=Array.isArray(snapshot.search_appearance)?snapshot.search_appearance:[];
  return {
    schema_version:'maison_search_visibility_v1',
    provenance:{
      provider_id:snapshot.provider_id,
      collector:snapshot.collector,
      property:snapshot.property,
      observed_at:snapshot.observed_at,
      window:snapshot.window,
      snapshot_schema:snapshot.schema
    },
    contract:{
      observational_only:true,
      external_evidence:true,
      publication_authority:false,
      commercial_authority:false,
      snapshot_is_not_live_truth:true,
      knowledge_graph_sink:'maison_knowledge_graph_v1'
    },
    sitemap:snapshot.sitemap,
    search_appearance:searchAppearance,
    summary:{
      observed_urls:pages.length,
      current_public_urls:current.length,
      legacy_observed_urls:legacy.length,
      recovered_legacy_urls:recovered.length,
      unrecovered_legacy_urls:unrecovered.map(row=>row.url),
      observed_clicks:sum(pages,'clicks'),
      observed_impressions:sum(pages,'impressions'),
      legacy_clicks:sum(legacy,'clicks'),
      legacy_impressions:sum(legacy,'impressions'),
      current_public_impressions:sum(current,'impressions'),
      search_appearance_features:searchAppearance.length,
      product_snippet_impressions:sum(searchAppearance.filter(row=>row.feature==='PRODUCT_SNIPPETS'),'impressions')
    },
    priority_recovery:legacy
      .slice()
      .sort((a,b)=>b.impressions-a.impressions||a.position-b.position||a.url.localeCompare(b.url))
      .slice(0,20),
    pages
  };
}

export function writeSearchVisibility({check=false}={}){
  const out=JSON.stringify(buildSearchVisibility(),null,2)+'\n';
  if(check){
    if(!fs.existsSync(OUTPUT)||fs.readFileSync(OUTPUT,'utf8')!==out){
      console.error('search-visibility.generated.json is stale; run build_search_visibility.mjs');
      return false;
    }
    console.log('MAISON search visibility graph: OK');
    return true;
  }
  fs.writeFileSync(OUTPUT,out);
  console.log('Wrote MAISON search visibility graph');
  return true;
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const ok=writeSearchVisibility({check:process.argv.includes('--check')});
  if(!ok)process.exit(1);
}
