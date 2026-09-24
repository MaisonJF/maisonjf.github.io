#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { MAISON_OFFER_CATALOGUE } from '../../../functions/_lib/offer-brain.js';
import { ORACLE_TERRITORIES } from '../../../functions/_lib/oracle-territories.js';
import { buildPdiThemeSourceSignals } from '../../../functions/_lib/pdi-theme-sources.js';

const PRODUCTS_URL=new URL('../../../data/products.js',import.meta.url);
const SERVICES_URL=new URL('../../../data/services.js',import.meta.url);
const OUTPUT_URL=new URL('commercial-assets.generated.json',import.meta.url);

function loadWindow(url){
  const source=fs.readFileSync(url,'utf8');
  const sandbox={window:{}};
  vm.createContext(sandbox);
  vm.runInContext(source,sandbox,{filename:url.pathname});
  return sandbox.window;
}

function moneyMinor(value){
  if(value===null || value===undefined || value==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n) || n<0) throw new Error('invalid catalogue money value');
  return Math.round(n*100);
}

function euroMinorFromLabel(value){
  const text=String(value||'').trim();
  const match=text.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if(!match)return null;
  const amount=Number(match[1].replace(',','.'));
  return Number.isFinite(amount)&&amount>=0?Math.round(amount*100):null;
}

function servicePricing(service){
  const label=String(service.price||'').trim();
  const lower=label.toLowerCase();
  const options=(Array.isArray(service.formats)?service.formats:[])
    .map(raw=>{
      const text=String(raw||'').trim();
      const match=text.match(/^(.+?)\s*·\s*(\d+(?:[.,]\d+)?)\s*€\s*$/);
      if(!match)return null;
      return {
        label:match[1].trim(),
        amount_minor:Math.round(Number(match[2].replace(',','.'))*100)
      };
    })
    .filter(Boolean);

  if(options.length){
    return {
      price_kind:'multi_format',
      minimum_price_minor:Math.min(...options.map(x=>x.amount_minor)),
      price_options:options,
      price_source:'formats'
    };
  }
  if(Number.isInteger(service.amount)){
    return {
      price_kind:'fixed',
      minimum_price_minor:service.amount,
      price_options:[],
      price_source:'amount_field'
    };
  }
  const parsed=euroMinorFromLabel(label);
  if(parsed!==null && (lower.startsWith('desde ')||lower.startsWith('a partir de '))){
    return {
      price_kind:'starting_from',
      minimum_price_minor:parsed,
      price_options:[],
      price_source:'price_label'
    };
  }
  if(parsed!==null){
    return {
      price_kind:'fixed',
      minimum_price_minor:parsed,
      price_options:[],
      price_source:'price_label'
    };
  }
  const quoteContext=(label+' '+String(service.door||'')+' '+String(service.kind||'')).toLowerCase();
  if(quoteContext.includes('sob orçamento')||service.kind==='profissional'||service.kind==='especial'){
    return {
      price_kind:'quote',
      minimum_price_minor:null,
      price_options:[],
      price_source:'quote'
    };
  }
  return {
    price_kind:'unknown',
    minimum_price_minor:null,
    price_options:[],
    price_source:'unknown'
  };
}

function operationalUnknowns(kind){
  if(kind==='physical_product'){
    return {
      inventory_quantity:null,
      reserved_quantity:null,
      unit_material_cost_minor:null,
      packaging_cost_minor:null,
      production_minutes_per_unit:null,
      batch_capacity_units:null,
      moq_units:null,
      shelf_life_days:null,
      supplier_lead_days:null
    };
  }
  return {
    capacity_units_per_period:null,
    capacity_period:null,
    human_effort_minutes:null,
    variable_cost_minor:null,
    delivery_lead_days:null
  };
}

const products=loadWindow(PRODUCTS_URL);
const services=loadWindow(SERVICES_URL);
const assets=[];

function digitalOperationalUnknowns(){
  return {
    capacity_units_per_period:null,
    capacity_period:null,
    human_effort_minutes:null,
    variable_cost_minor:null,
    delivery_lead_days:null
  };
}

for(const p of products.MAISON_PRODUCTS||[]){
  assets.push({
    asset_ref:`catalog:product:${p.slug}`,
    source_kind:'public_product_catalogue',
    asset_type:'physical_product',
    slug:p.slug,
    sku:p.sku||null,
    name:p.name,
    size:p.size||null,
    category:p.category||null,
    public:true,
    lifecycle_status:'active',
    price_minor:moneyMinor(p.price),
    price_label:p.price==null?null:String(p.price),
    currency:p.currency||null,
    catalogue_availability:p.availability||null,
    condition:p.condition||null,
    description:p.description||'',
    search_context:[p.category,p.name,p.size,p.description,p.ritual?.title,p.ritual?.text].filter(Boolean),
    operational:operationalUnknowns('physical_product')
  });
}

for(const p of products.MAISON_PRODUCT_FUTURE||[]){
  const slug=p.slug||String(p.name||'future').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  assets.push({
    asset_ref:`catalog:future-product:${slug}`,
    source_kind:'public_product_future_registry',
    asset_type:'physical_product',
    slug:p.slug||null,
    sku:null,
    name:p.name,
    size:null,
    category:null,
    public:false,
    lifecycle_status:'future',
    price_minor:null,
    price_label:null,
    currency:null,
    catalogue_availability:null,
    condition:null,
    description:p.note||'',
    search_context:[p.name,p.note].filter(Boolean),
    operational:operationalUnknowns('physical_product')
  });
}

for(const s of services.MAISON_SERVICES||[]){
  const pricing=servicePricing(s);
  const row={
    asset_ref:`catalog:service:${s.slug}`,
    source_kind:'service_catalogue',
    asset_type:s.kind==='profissional'?'b2b_service':'service',
    slug:s.slug,
    sku:null,
    name:s.name,
    size:null,
    category:s.door||s.group||s.kind||null,
    public:s.public!==false,
    lifecycle_status:'active',
    price_minor:pricing.price_kind==='fixed'?pricing.minimum_price_minor:null,
    price_label:s.price==null?null:String(s.price),
    currency:'EUR',
    catalogue_availability:null,
    condition:null,
    description:s.description||'',
    search_context:[
      s.kind,s.group,s.door,s.name,s.description,s.limits,
      ...(Array.isArray(s.entry)?s.entry:[]),
      ...(Array.isArray(s.formats)?s.formats:[])
    ].filter(Boolean),
    operational:operationalUnknowns('service')
  };
  row.price_kind=pricing.price_kind;
  row.minimum_price_minor=pricing.minimum_price_minor;
  row.price_options=pricing.price_options;
  row.price_source=pricing.price_source;
  assets.push(row);
}


const oracleOffers=MAISON_OFFER_CATALOGUE.filter(x=>x.family==='oracle'&&x.status!=='hidden');
const pdiOffers=MAISON_OFFER_CATALOGUE.filter(x=>x.family==='pdi'&&x.status!=='hidden');
const pdiSignals=buildPdiThemeSourceSignals();

function commonFixedAmount(offers,label){
  const amounts=[...new Set(offers.map(x=>x.amount).filter(Number.isInteger))];
  if(amounts.length!==1)throw new Error('digital_price_contract_mismatch:'+label);
  return amounts[0];
}

const oracleAmount=commonFixedAmount(oracleOffers,'oracle');
assets.push({
  asset_ref:'catalog:digital:oracle',
  source_kind:'offer_brain_digital_product',
  asset_type:'digital_product',
  slug:'oracle',
  sku:null,
  name:'Oráculo MAISON JF®',
  size:null,
  category:'Produto digital',
  public:true,
  lifecycle_status:'active',
  price_minor:oracleAmount,
  price_label:(oracleOffers[0]?.priceLabel||''),
  currency:'EUR',
  catalogue_availability:null,
  condition:null,
  description:'Uma abertura simbólica por território para olhar para uma pergunta a partir de outra perspectiva.',
  search_context:[
    'oracle','oráculo','produto digital','abertura','reflexão',
    ...oracleOffers.flatMap(x=>[x.title,x.description,...(x.axes||[]),...(x.territories||[]),...(x.routes||[])]),
    ...ORACLE_TERRITORIES.flatMap(x=>[x.slug,x.label,x.group,x.focus,x.signal,x.hidden,x.anchor,x.move,x.question])
  ].filter(Boolean),
  content_system:{
    source:'functions/_lib/oracle-territories.js',
    territory_count:ORACLE_TERRITORIES.length,
    ocean_feed:'editorial_queue.oracle_candidate',
    roles:['opening','recognition','tension','counterpoint','reframe','movement','close'],
    paid_bodies_in_git:false
  },
  operational:digitalOperationalUnknowns(),
  price_kind:'fixed',
  minimum_price_minor:oracleAmount,
  price_options:[],
  price_source:'offer_brain'
});

const pdiAmount=commonFixedAmount(pdiOffers,'pdi');
assets.push({
  asset_ref:'catalog:digital:pdi',
  source_kind:'offer_brain_digital_product',
  asset_type:'digital_product',
  slug:'para-de-ignorar',
  sku:null,
  name:'PÁRA DE IGNORAR!',
  size:null,
  category:'Jogo digital',
  public:true,
  lifecycle_status:'active',
  price_minor:pdiAmount,
  price_label:(pdiOffers[0]?.priceLabel||''),
  currency:'EUR',
  catalogue_availability:null,
  condition:null,
  description:'28 perguntas. Duas pessoas. Uma conversa que não precisa de guardar respostas.',
  search_context:[
    'pdi','pára de ignorar','para de ignorar','jogo digital','28 perguntas','duas pessoas','conversa',
    ...pdiOffers.flatMap(x=>[x.title,x.description,...(x.axes||[]),...(x.territories||[]),...(x.routes||[])]),
    ...pdiSignals.flatMap(x=>[x.slug,x.label,x.family,x.focus,x.signal,x.hidden])
  ].filter(Boolean),
  content_system:{
    source:'functions/_lib/pdi-theme-sources.js',
    source_theme_count:pdiSignals.length,
    ocean_feed:'editorial_queue.question_candidate',
    stages:['open','recognize','deepen','touch','close','signature'],
    paid_bodies_in_git:false
  },
  operational:digitalOperationalUnknowns(),
  price_kind:'fixed',
  minimum_price_minor:pdiAmount,
  price_options:[],
  price_source:'offer_brain'
});

assets.sort((a,b)=>a.asset_ref.localeCompare(b.asset_ref));

const payload={
  schema_version:'commercial_assets_v1',
  sources:['data/products.js','data/services.js','functions/_lib/offer-brain.js'],
  contract:{
    derived_projection:true,
    canonical_catalogues_unchanged:true,
    catalogue_in_stock_is_not_counted_inventory:true,
    operational_unknowns_remain_null:true,
    private_inventory_overlay_not_stored_here:true,
    structured_service_pricing:true,
    multi_format_prices_not_flattened:true,
    quote_prices_remain_unknown:true,
    commercial_pii:false,
    digital_assets_from_offer_brain:true
  },
  summary:{
    total:assets.length,
    active_physical_products:assets.filter(x=>x.asset_type==='physical_product'&&x.lifecycle_status==='active').length,
    future_products:assets.filter(x=>x.lifecycle_status==='future').length,
    digital_products:assets.filter(x=>x.asset_type==='digital_product').length,
    services:assets.filter(x=>x.asset_type==='service').length,
    b2b_services:assets.filter(x=>x.asset_type==='b2b_service').length,
    fixed_price_services:assets.filter(x=>['service','b2b_service'].includes(x.asset_type)&&x.price_kind==='fixed').length,
    multi_format_services:assets.filter(x=>['service','b2b_service'].includes(x.asset_type)&&x.price_kind==='multi_format').length,
    starting_from_services:assets.filter(x=>['service','b2b_service'].includes(x.asset_type)&&x.price_kind==='starting_from').length,
    quote_services:assets.filter(x=>['service','b2b_service'].includes(x.asset_type)&&x.price_kind==='quote').length
  },
  assets
};

const rendered=JSON.stringify(payload,null,2)+'\n';
if(process.argv.includes('--check')){
  const current=fs.readFileSync(OUTPUT_URL,'utf8');
  if(current!==rendered){
    console.error('commercial-assets.generated.json is stale; run build_commercial_assets.mjs');
    process.exit(1);
  }
  console.log('Commercial assets registry: OK');
} else {
  fs.writeFileSync(OUTPUT_URL,rendered);
  console.log(`Wrote ${assets.length} commercial assets`);
}
