import fs from 'node:fs';
import {buildPublicDiscovery} from './build_public_discovery.mjs';
import {buildSearchVisibility} from './build_search_visibility.mjs';

const oceans=JSON.parse(fs.readFileSync(new URL('../oceans/candidates.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../../../functions/_lib/offer-brain.js',import.meta.url),'utf8');
const match=source.match(/export const MAISON_OFFER_CATALOGUE=(\[[\s\S]*?\n\]);\n\nexport function/);
if(!match)throw new Error('offer_catalogue_not_found');
const offers=Function('"use strict";return ('+match[1]+')')();

const b2bSource=fs.readFileSync(new URL('../../../functions/_lib/b2b-offer-brain.js',import.meta.url),'utf8');
const b2bMatch=b2bSource.match(/export const MAISON_B2B_BRAIN=(\{[\s\S]*?\n\});\n\nexport function/);
if(!b2bMatch)throw new Error('b2b_brain_not_found');
const b2b=Function('"use strict";return ('+b2bMatch[1]+')')();
const discovery=buildPublicDiscovery();
const searchVisibility=buildSearchVisibility();
const publicIdentity=JSON.parse(fs.readFileSync(new URL('public-entity-evidence.json',import.meta.url),'utf8'));
const externalEntityAuthority=JSON.parse(fs.readFileSync(new URL('external-entity-authority.json',import.meta.url),'utf8'));

const TERRITORIES={
  casa:{label:'Casa',url:'/portas/casa'},
  corpo:{label:'Corpo',url:'/portas/corpo'},
  cabeca:{label:'Cabeça',url:'/portas/cabeca'},
  presenca:{label:'Presença',url:'/portas/companhia'}
};

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function uniq(xs){return [...new Set(xs.filter(Boolean))]}
function oceanId(o){return o.id||o.slug||o.territory||null}
function oceanThemes(o){return Array.isArray(o.themes)?o.themes:(Array.isArray(o.questionThemeCandidates)?o.questionThemeCandidates:[])}
function oceanText(o){return norm([oceanId(o),o.domain,o.intent,o.painLanguage,...oceanThemes(o)].join(' '))}
function inferredTerritories(o){
  const explicit=uniq([o.territory,o.domain].flat().map(norm).map(x=>x==='companhia'?'presenca':x).filter(x=>TERRITORIES[x]));
  if(explicit.length)return explicit;
  const t=oceanText(o), out=[];
  if(/casa|lar|ambiente|ritual|planta|aroma|descanso/.test(t))out.push('casa');
  if(/corpo|sono|cansa|sensorial|energia|toque|descanso/.test(t))out.push('corpo');
  if(/decis|pens|aten|incerte|trabalho|dinheiro|escolha|rumina|futuro/.test(t))out.push('cabeca');
  if(/relac|vinc|companh|solid|amiz|famil|presen|afeto|cuidad|resposta|conexao/.test(t))out.push('presenca');
  return uniq(out).slice(0,3);
}

const oceanList=Array.isArray(oceans)?oceans:(oceans.candidates||[]);
const territories=Object.entries(TERRITORIES).map(([id,base])=>({
  id,...base,
  relatedOffers:offers.filter(o=>(o.territories||[]).includes(id)&&o.status!=='hidden').map(o=>o.id),
  relatedOceans:oceanList.filter(o=>inferredTerritories(o).includes(id)).map(o=>oceanId(o)).filter(Boolean)
}));
const graph={
  schema_version:'maison_knowledge_graph_v1',
  generated_from:['.github/maison-growth/oceans/candidates.json','functions/_lib/offer-brain.js','functions/_lib/b2b-offer-brain.js','sitemap.xml','robots.txt','llms.txt','public HTML backing files','.github/maison-growth/brain/search-visibility-baseline.json','.github/maison-growth/brain/public-entity-evidence.json','.github/maison-growth/brain/external-entity-authority.json','_redirects'],
  principle:'Humano vê João. Máquina vê estrutura. Brain compreende os dois. MAISON transforma isso em desejo, utilidade e negócio.',
  contract:{
    machine_facing:true,
    public_copy_source:false,
    hidden_claims_forbidden:true,
    public_relationships_must_match_visible_content:true,
    oceans_internal_by_default:true,
    providers_do_not_define_voice:true
  },
  territories,
  professional:{
    surface:{...b2b.surface},
    serviceAssetRef:b2b.serviceAssetRef,
    dimensions:[...(b2b.dimensions||[])],
    opportunityTypes:[...(b2b.opportunityTypes||[])],
    diagnosticOpportunityMap:Object.fromEntries(
      Object.entries(b2b.diagnosticOpportunityMap||{}).map(([key,value])=>[key,[...value]])
    ),
    segments:(b2b.segments||[]).map(x=>({
      id:x.id,label:x.label,status:x.status,
      territories:[...(x.territories||[])],routes:[...(x.routes||[])]
    })),
    needs:(b2b.needs||[]).map(x=>({...x})),
    offerFamilies:(b2b.offerFamilies||[]).map(x=>({
      ...x,
      segments:[...(x.segments||[])],routes:[...(x.routes||[])],recurrence:[...(x.recurrence||[])]
    })),
    commercialReadiness:{
      ...(b2b.commercialReadiness||{}),
      requiredBeforeQuote:[...(b2b.commercialReadiness?.requiredBeforeQuote||[])],
      optionalWhenRelevant:[...(b2b.commercialReadiness?.optionalWhenRelevant||[])],
      unknownByDefault:[...(b2b.commercialReadiness?.unknownByDefault||[])],
      productRefs:[...(b2b.commercialReadiness?.productRefs||[])]
    },
    recurrence:{
      ...(b2b.recurrence||{}),
      supportedNow:[...(b2b.recurrence?.supportedNow||[])],
      pilotOnly:[...(b2b.recurrence?.pilotOnly||[])],
      futureValidation:[...(b2b.recurrence?.futureValidation||[])]
    },
    leadContract:{
      ...(b2b.leadContract||{}),
      allowedNonPii:[...(b2b.leadContract?.allowedNonPii||[])],
      forbidden:[...(b2b.leadContract?.forbidden||[])]
    },
    professionalNetwork:{
      ...(b2b.professionalNetwork||{}),
      levels:(b2b.professionalNetwork?.levels||[]).map(level=>({
        ...level,
        can:[...(level.can||[])],
        cannot:[...(level.cannot||[])]
      })),
      safeguards:{...(b2b.professionalNetwork?.safeguards||{})},
      economicsHypotheses:[...(b2b.professionalNetwork?.economicsHypotheses||[])]
    },
    researchCandidates:(b2b.researchCandidates||[]).map(x=>({
      ...x,
      segments:[...(x.segments||[])],
      evidence:(x.evidence||[]).map(e=>({...e}))
    })),
    routes:(b2b.routes||[]).map(x=>({...x})),
    evidencePolicy:{...(b2b.evidencePolicy||{})}
  },
  publicDiscovery:{
    schema_version:discovery.schema_version,
    protocols:discovery.protocols,
    summary:discovery.summary,
    pages:discovery.pages.map(page=>({
      url:page.url,
      source_file:page.source_file,
      group:page.group,
      title:page.title,
      structured_data_types:page.structured_data.types,
      internal_links:page.internal_links,
      internal_link_in_degree:page.internal_link_in_degree,
      internal_link_out_degree:page.internal_link_out_degree
    }))
  },
  publicIdentity:{
    schema_version:publicIdentity.schema_version,
    organization_id:publicIdentity.organization_id,
    same_as:publicIdentity.same_as.map(item=>({
      platform:item.platform,
      public_url:item.public_url
    })),
    external_authority:{
      schema_version:externalEntityAuthority.schema_version,
      observed_at:externalEntityAuthority.observed_at,
      profiles:externalEntityAuthority.profiles.map(profile=>({
        platform:profile.platform,
        username:profile.username,
        bio_domain_mention:profile.bio_domain_mention,
        reciprocal_site_link:profile.reciprocal_site_link
      })),
      gaps:externalEntityAuthority.gaps
    }
  },
  searchVisibility:{
    schema_version:searchVisibility.schema_version,
    provenance:searchVisibility.provenance,
    contract:searchVisibility.contract,
    sitemap:searchVisibility.sitemap,
    search_appearance:searchVisibility.search_appearance,
    summary:searchVisibility.summary,
    priority_recovery:searchVisibility.priority_recovery,
    pages:searchVisibility.pages
  },
  offers:offers.filter(o=>o.status!=='hidden').map(o=>({
    id:o.id,title:o.title,href:o.href,format:o.format,family:o.family,stage:o.stage,
    territories:o.territories||[],axes:o.axes||[],routes:o.routes||[]
  })),
  oceans:oceanList.map(o=>({
    id:oceanId(o),
    intent:o.intent||null,
    themes:oceanThemes(o),
    territories:inferredTerritories(o),
    visibility:'internal'
  }))
};
const out=JSON.stringify(graph,null,2)+'\n';
const coreGraph={
  schema_version:graph.schema_version,
  generated_from:[
    '.github/maison-growth/oceans/candidates.json',
    'functions/_lib/offer-brain.js',
    'functions/_lib/b2b-offer-brain.js'
  ],
  principle:graph.principle,
  contract:graph.contract,
  territories:graph.territories,
  professional:graph.professional,
  offers:graph.offers,
  oceans:graph.oceans
};
const coreOut=JSON.stringify(coreGraph,null,2)+'\n';
const outputUrl=new URL('maison-knowledge-graph.generated.json',import.meta.url);
if(process.argv.includes('--check')){
  const current=fs.existsSync(outputUrl)?fs.readFileSync(outputUrl,'utf8'):'';
  if(current!==out&&current!==coreOut){
    console.error('maison-knowledge-graph.generated.json is stale; run build_maison_knowledge_graph.mjs or update the committed core snapshot');
    process.exit(1);
  }
  console.log('MAISON knowledge graph: OK · '+(current===out?'enriched':'core')+' snapshot');
}else{
  fs.writeFileSync(outputUrl,out);
  console.log('Wrote MAISON knowledge graph with '+territories.length+' territories, '+graph.offers.length+' offers, '+graph.professional.segments.length+' professional segments and '+graph.oceans.length+' Oceans');
}
