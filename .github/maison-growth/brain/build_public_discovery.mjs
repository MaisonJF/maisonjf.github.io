import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAISON_PUBLIC_SCHEMA_VERSION,derivedSchemaForPublicPage,structuredDataFacts} from '../../../functions/_lib/public-structured-data.js';

const DOMAIN='https://maison-jf.com';
const ROOT=path.resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const OUTPUT=path.join(ROOT,'.github/maison-growth/brain/public-discovery.generated.json');

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8')}
function compact(v){return String(v||'').replace(/\s+/g,' ').trim()}
function decode(v){
  return compact(v)
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function attr(tag,name){
  const m=tag.match(new RegExp("\\b"+name+"\\s*=\\s*[\\\"']([^\\\"']*)[\\\"']","i"));
  return m?decode(m[1]):'';
}
function titleOf(html){const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);return m?decode(m[1].replace(/<[^>]+>/g,' ')):''}
function metaOf(html,name){
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    if(attr(tag,'name').toLowerCase()===name.toLowerCase())return attr(tag,'content');
  }
  return '';
}
function canonicalOf(html){
  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    if(attr(tag,'rel').toLowerCase()==='canonical')return attr(tag,'href');
  }
  return '';
}
function visiblePriceOf(html){
  const m=html.match(/<([a-z0-9]+)\b[^>]*\bdata-price\b[^>]*>([\s\S]*?)<\/\1>/i);
  return m?decode(m[2].replace(/<[^>]+>/g,' ')):'';
}
function jsonLdFacts(html){
  const types=new Set(), ids=new Set();
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  function walk(v){
    if(Array.isArray(v)){v.forEach(walk);return}
    if(!v||typeof v!=='object')return;
    const t=v['@type'];
    if(Array.isArray(t))t.forEach(x=>types.add(String(x)));
    else if(t)types.add(String(t));
    if(v['@id'])ids.add(String(v['@id']));
    Object.values(v).forEach(walk);
  }
  for(const m of scripts){
    try{walk(JSON.parse(m[1]))}catch(_){}
  }
  return {types:[...types].sort(),ids:[...ids].sort(),blocks:scripts.length};
}
function backingFile(url){
  const p=new URL(url).pathname;
  const rel=p.replace(/^\//,'');
  if(!rel)return 'index.html';
  if(p.endsWith('/'))return path.posix.join(rel,'index.html');
  const exact=path.join(ROOT,rel);
  if(fs.existsSync(exact)&&fs.statSync(exact).isFile())return rel;
  if(fs.existsSync(path.join(ROOT,rel+'.html')))return rel+'.html';
  if(fs.existsSync(path.join(ROOT,rel,'index.html')))return path.posix.join(rel,'index.html');
  return rel+'.html';
}
function groupOf(url){
  const p=new URL(url).pathname.replace(/^\/+|\/+$/g,'');
  return p?p.split('/')[0]:'home';
}
function sitemapEntries(){
  const index=read('sitemap.xml');
  const childUrls=[...index.matchAll(/<loc>(https:\/\/maison-jf\.com\/[^<]+\.xml)<\/loc>/g)].map(m=>m[1]);
  if(!childUrls.length)throw new Error('sitemap_children_missing');
  const rows=[];
  for(const childUrl of childUrls){
    const child=new URL(childUrl).pathname.split('/').pop();
    const xml=read(child);
    if(!/<urlset\b/i.test(xml))throw new Error('sitemap_child_not_urlset:'+child);
    for(const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)){
      const block=m[1];
      const loc=(block.match(/<loc>([^<]+)<\/loc>/)||[])[1];
      if(!loc)continue;
      rows.push({
        url:decode(loc),
        lastmod:decode((block.match(/<lastmod>([^<]+)<\/lastmod>/)||[])[1]||''),
        priority:decode((block.match(/<priority>([^<]+)<\/priority>/)||[])[1]||''),
        sitemap:child
      });
    }
  }
  return {childUrls,rows};
}
function redirects(){
  const out=new Map();
  for(const raw of read('_redirects').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const parts=line.split(/\s+/);
    if(parts.length<2||!parts[0].startsWith('/')||/[*:]/.test(parts[0]))continue;
    out.set(parts[0],parts[1]);
  }
  return out;
}
function internalLinkFacts(html,pageUrl,publicSet,redirectMap){
  const publicLinks=new Set(),redirecting=[];
  for(const tag of html.match(/<a\b[^>]*>/gi)||[]){
    const raw=attr(tag,'href');
    if(!raw||raw.startsWith('#')||/^(mailto:|tel:|javascript:|data:)/i.test(raw))continue;
    let u; try{u=new URL(raw,pageUrl)}catch(_){continue}
    if(u.origin!==DOMAIN&&u.origin!=='https://www.maison-jf.com')continue;
    u.hostname='maison-jf.com';u.search='';u.hash='';
    if(redirectMap.has(u.pathname)){
      redirecting.push({href:raw,resolved:u.href,redirect_to:redirectMap.get(u.pathname)});
    }
    if(publicSet.has(u.href))publicLinks.add(u.href);
  }
  return {
    publicLinks:[...publicLinks].sort(),
    redirecting:redirecting.sort((a,b)=>a.resolved.localeCompare(b.resolved)||a.href.localeCompare(b.href))
  };
}
export function buildPublicDiscovery(){
  const {childUrls,rows}=sitemapEntries();
  const publicSet=new Set(rows.map(x=>x.url));
  const redirectMap=redirects();
  const seen=new Set();
  const pages=[];
  for(const row of rows){
    if(seen.has(row.url))throw new Error('duplicate_public_url:'+row.url);
    seen.add(row.url);
    const sourceFile=backingFile(row.url);
    const full=path.join(ROOT,sourceFile);
    if(!fs.existsSync(full))throw new Error('public_backing_file_missing:'+sourceFile);
    const html=fs.readFileSync(full,'utf8');
    const canonical=canonicalOf(html);
    const robots=metaOf(html,'robots');
    if(canonical!==row.url)throw new Error('canonical_mismatch:'+row.url+':'+canonical);
    if(/noindex/i.test(robots))throw new Error('sitemap_page_noindex:'+row.url);
    const title=titleOf(html);
    const description=metaOf(html,'description');
    const staticStructured=jsonLdFacts(html);
    const derivedSchema=derivedSchemaForPublicPage({
      url:canonical,
      title,
      description,
      robots,
      priceText:visiblePriceOf(html),
      staticJsonLdBlocks:staticStructured.blocks
    });
    const derivedFacts=derivedSchema?structuredDataFacts(derivedSchema):null;
    const structured=derivedFacts
      ? {...derivedFacts,blocks:1,html_blocks:0,source:'edge_derived'}
      : {...staticStructured,html_blocks:staticStructured.blocks,source:staticStructured.blocks?'html':'none'};
    const linkFacts=internalLinkFacts(html,row.url,publicSet,redirectMap);
    pages.push({
      url:row.url,
      source_file:sourceFile,
      group:groupOf(row.url),
      title,
      description,
      robots,
      lastmod:row.lastmod||null,
      priority:row.priority||null,
      structured_data:structured,
      internal_links:linkFacts.publicLinks,
      redirecting_internal_links:linkFacts.redirecting
    });
  }
  const incoming=new Map(pages.map(page=>[page.url,new Set()]));
  for(const page of pages){
    for(const target of page.internal_links){
      if(target!==page.url&&incoming.has(target))incoming.get(target).add(page.url);
    }
  }
  for(const page of pages){
    page.internal_link_out_degree=page.internal_links.length;
    page.internal_link_incoming=[...(incoming.get(page.url)||[])].sort();
    page.internal_link_in_degree=page.internal_link_incoming.length;
  }

  const groups={},schemaTypes={},structuredSources={},linkGroups={};
  let structuredPages=0,edges=0;
  for(const page of pages){
    groups[page.group]=(groups[page.group]||0)+1;
    if(page.structured_data.blocks)structuredPages++;
    structuredSources[page.structured_data.source]=(structuredSources[page.structured_data.source]||0)+1;
    edges+=page.internal_links.length;
    for(const t of page.structured_data.types)schemaTypes[t]=(schemaTypes[t]||0)+1;
    if(!linkGroups[page.group])linkGroups[page.group]={pages:0,incoming_edges:0,outgoing_edges:0,orphans:0};
    linkGroups[page.group].pages++;
    linkGroups[page.group].incoming_edges+=page.internal_link_in_degree;
    linkGroups[page.group].outgoing_edges+=page.internal_link_out_degree;
    if(page.internal_link_in_degree===0)linkGroups[page.group].orphans++;
  }
  const orphanPages=pages.filter(page=>page.internal_link_in_degree===0).map(page=>page.url).sort();
  const lowAuthorityPages=pages.filter(page=>page.internal_link_in_degree<=1).map(page=>page.url).sort();
  const redirectingInternalLinks=pages.flatMap(page=>
    page.redirecting_internal_links.map(link=>({source:page.url,...link}))
  );
  const missingMetadata=pages
    .filter(page=>!page.title||!page.description)
    .map(page=>({url:page.url,title:page.title,description:page.description}));
  function duplicatesBy(field){
    const buckets=new Map();
    for(const page of pages){
      const value=compact(page[field]).toLocaleLowerCase('pt-PT');
      if(!value)continue;
      if(!buckets.has(value))buckets.set(value,[]);
      buckets.get(value).push(page.url);
    }
    return [...buckets.entries()]
      .filter(([,urls])=>urls.length>1)
      .map(([value,urls])=>({value,urls:urls.sort()}))
      .sort((a,b)=>a.value.localeCompare(b.value,'pt-PT'));
  }
  const duplicateTitles=duplicatesBy('title');
  const duplicateDescriptions=duplicatesBy('description');
  const schemaRevision=(MAISON_PUBLIC_SCHEMA_VERSION.match(/^\d{4}-\d{2}-\d{2}/)||[])[0]||'';
  const staleEdgeSchemaLastmod=pages
    .filter(page=>page.structured_data.source==='edge_derived'&&schemaRevision&&String(page.lastmod||'')<schemaRevision)
    .map(page=>page.url).sort();
  const robots=read('robots.txt'), llms=read('llms.txt');
  return {
    schema_version:'maison_public_discovery_v1',
    generated_from:['sitemap.xml',...childUrls.map(u=>new URL(u).pathname.slice(1)),'sitemap-images.xml','robots.txt','llms.txt','public HTML backing files','functions/_lib/public-structured-data.js','functions/_lib/public-structured-data-middleware.js','functions/oraculo/_middleware.js','functions/respostas/_middleware.js','functions/teste/_middleware.js','functions/ebooks/_middleware.js','functions/profissionais/_middleware.js','functions/press/_middleware.js','functions/trabalho/_middleware.js','functions/presentes/_middleware.js','functions/espiritualidade/_middleware.js','functions/envios.js'],
    contract:{
      derived_from_public_surfaces_only:true,
      hidden_claims_forbidden:true,
      publication_authority:false,
      commercial_authority:false,
      canonical_urls_are_page_identity:true,
      effective_surface_includes_edge_derived_schema:true,
      knowledge_graph_sink:'maison_knowledge_graph_v1'
    },
    protocols:{
      sitemap_index:'https://maison-jf.com/sitemap.xml',
      robots:'https://maison-jf.com/robots.txt',
      llms:'https://maison-jf.com/llms.txt',
      sitemap_declared_in_robots:/Sitemap:\s*https:\/\/maison-jf\.com\/sitemap\.xml/i.test(robots),
      image_sitemap_url:'https://maison-jf.com/sitemap-images.xml',
      image_sitemap_declared_in_robots:/Sitemap:\s*https:\/\/maison-jf\.com\/sitemap-images\.xml/i.test(robots),
      llms_identifies_canonical_site:/Canonical site:\s*https:\/\/maison-jf\.com\//i.test(llms)
    },
    summary:{
      page_count:pages.length,
      structured_data_pages:structuredPages,
      structured_data_coverage:Number((structuredPages/Math.max(1,pages.length)).toFixed(4)),
      internal_link_edges:edges,
      orphan_pages:orphanPages,
      low_in_degree_pages:lowAuthorityPages,
      redirecting_internal_links:redirectingInternalLinks,
      missing_metadata:missingMetadata,
      duplicate_titles:duplicateTitles,
      duplicate_descriptions:duplicateDescriptions,
      link_groups:linkGroups,
      groups,
      schema_types:schemaTypes,
      structured_data_sources:structuredSources,
      structured_data_revision:MAISON_PUBLIC_SCHEMA_VERSION,
      stale_edge_schema_lastmod:staleEdgeSchemaLastmod
    },
    pages
  };
}
export function writePublicDiscovery({check=false}={}){
  const out=JSON.stringify(buildPublicDiscovery(),null,2)+'\n';
  if(check){
    if(!fs.existsSync(OUTPUT)||fs.readFileSync(OUTPUT,'utf8')!==out){
      console.error('public-discovery.generated.json is stale; run build_public_discovery.mjs');
      return false;
    }
    console.log('MAISON public discovery graph: OK');
    return true;
  }
  fs.writeFileSync(OUTPUT,out);
  console.log('Wrote MAISON public discovery graph');
  return true;
}
const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const ok=writePublicDiscovery({check:process.argv.includes('--check')});
  if(!ok)process.exit(1);
}
