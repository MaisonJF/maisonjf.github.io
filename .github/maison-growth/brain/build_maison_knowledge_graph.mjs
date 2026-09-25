import fs from 'node:fs';

const oceans=JSON.parse(fs.readFileSync(new URL('../oceans/candidates.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../../../functions/_lib/offer-brain.js',import.meta.url),'utf8');
const match=source.match(/export const MAISON_OFFER_CATALOGUE=(\[[\s\S]*?\n\]);\n\nexport function/);
if(!match)throw new Error('offer_catalogue_not_found');
const offers=Function('"use strict";return ('+match[1]+')')();

const b2bMarker=new URL('validate_b2b_knowledge_graph.mjs',import.meta.url);
const b2bUrl=new URL('../../../functions/_lib/b2b-offer-brain.js',import.meta.url);
let b2b=null;
if(fs.existsSync(b2bMarker)&&fs.existsSync(b2bUrl)){
  const b2bSource=fs.readFileSync(b2bUrl,'utf8');
  const b2bMatch=b2bSource.match(/export const MAISON_B2B_BRAIN=(\{[\s\S]*?\n\});\n\nexport function/);
  if(!b2bMatch)throw new Error('b2b_brain_not_found');
  b2b=Function('"use strict";return ('+b2bMatch[1]+')')();
}

const discoveryBuilderUrl=new URL('build_public_discovery.mjs',import.meta.url);
let discovery=null;
if(fs.existsSync(discoveryBuilderUrl)){
  const module=await import('./build_public_discovery.mjs');
  discovery=module.buildPublicDiscovery();
}

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
  const t=oceanText(o),out=[];
  if(/casa|lar|ambiente|ritual|planta|aroma|descanso/.test(t))out.push('casa');
  if(/corpo|sono|cansa|sensorial|energia|toque|descanso/.test(t))out.push('corpo');
  if(/decis|pens|aten|incerte|trabalho|dinheiro|escolha|rumina|futuro/.test(t))out.push('cabeca');
  if(/relac|vinc|companh|solid|amiz|famil|presen|afeto|cuidad|resposta|conexao/.test(t))out.push('presenca');
  return uniq(out).slice(0,3);
}

function professionalProjection(source){
  return {
    surface:{...source.surface},
    serviceAssetRef:source.serviceAssetRef,
    dimensions:[...(source.dimensions||[])],
    opportunityTypes:[...(source.opportunityTypes||[])],
    diagnosticOpportunityMap:Object.fromEntries(Object.entries(source.diagnosticOpportunityMap||{}).map(([key,value])=>[key,[...value]])),
    segments:(source.segments||[]).map(x=>({id:x.id,label:x.label,status:x.status,territories:[...(x.territories||[])],routes:[...(x.routes||[])]})),
    needs:(source.needs||[]).map(x=>({...x})),
    offerFamilies:(source.offerFamilies||[]).map(x=>({...x,segments:[...(x.segments||[])],routes:[...(x.routes||[])],recurrence:[...(x.recurrence||[])]})),
    recurrence:{...(source.recurrence||{}),supportedNow:[...(source.recurrence?.supportedNow||[])],pilotOnly:[...(source.recurrence?.pilotOnly||[])],futureValidation:[...(source.recurrence?.futureValidation||[])]},
    leadContract:{...(source.leadContract||{}),allowedNonPii:[...(source.leadContract?.allowedNonPii||[])],forbidden:[...(source.leadContract?.forbidden||[])]},
    professionalNetwork:{...(source.professionalNetwork||{}),levels:(source.professionalNetwork?.levels||[]).map(level=>({...level,can:[...(level.can||[])],cannot:[...(level.cannot||[])]})),safeguards:{...(source.professionalNetwork?.safeguards||{})},economicsHypotheses:[...(source.professionalNetwork?.economicsHypotheses||[])]},
    researchCandidates:(source.researchCandidates||[]).map(x=>({...x,segments:[...(x.segments||[])],evidence:(x.evidence||[]).map(e=>({...e}))})),
    routes:(source.routes||[]).map(x=>({...x})),
    evidencePolicy:{...(source.evidencePolicy||{})}
  };
}

function discoveryProjection(source){
  return {
    schema_version:source.schema_version,
    protocols:source.protocols,
    summary:source.summary,
    pages:source.pages.map(page=>({
      url:page.url,source_file:page.source_file,group:page.group,title:page.title,
      structured_data_types:page.structured_data.types,
      internal_links:page.internal_links,
      internal_link_in_degree:page.internal_link_in_degree,
      internal_link_out_degree:page.internal_link_out_degree
    }))
  };
}

const oceanList=Array.isArray(oceans)?oceans:(oceans.candidates||[]);
const territories=Object.entries(TERRITORIES).map(([id,base])=>({
  id,...base,
  relatedOffers:offers.filter(o=>(o.territories||[]).includes(id)&&o.status!=='hidden').map(o=>o.id),
  relatedOceans:oceanList.filter(o=>inferredTerritories(o).includes(id)).map(o=>oceanId(o)).filter(Boolean)
}));
const generatedFrom=['.github/maison-growth/oceans/candidates.json','functions/_lib/offer-brain.js'];
if(b2b)generatedFrom.push('functions/_lib/b2b-offer-brain.js');
if(discovery)generatedFrom.push(...(discovery.generated_from||[]));

const graph={
  schema_version:'maison_knowledge_graph_v1',
  generated_from:uniq(generatedFrom),
  principle:'Humano vê João. Máquina vê estrutura. Brain compreende os dois. MAISON transforma isso em desejo, utilidade e negócio.',
  contract:{
    machine_facing:true,
    public_copy_source:false,
    hidden_claims_forbidden:true,
    public_relationships_must_match_visible_content:true,
    oceans_internal_by_default:true,
    providers_do_not_define_voice:true,
    single_canonical_builder:true
  },
  territories,
  ...(b2b?{professional:professionalProjection(b2b)}:{}),
  ...(discovery?{publicDiscovery:discoveryProjection(discovery)}:{}),
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
const outputUrl=new URL('maison-knowledge-graph.generated.json',import.meta.url);
if(process.argv.includes('--check')){
  if(!fs.existsSync(outputUrl)||fs.readFileSync(outputUrl,'utf8')!==out){
    console.error('maison-knowledge-graph.generated.json is stale; run build_maison_knowledge_graph.mjs');
    process.exit(1);
  }
  console.log('MAISON knowledge graph: OK');
}else{
  fs.writeFileSync(outputUrl,out);
  const extras=[b2b?'professional':'',discovery?'publicDiscovery':''].filter(Boolean);
  console.log('Wrote MAISON knowledge graph with '+territories.length+' territories, '+graph.offers.length+' offers and '+graph.oceans.length+' Oceans'+(extras.length?' + '+extras.join(' + '):''));
}
