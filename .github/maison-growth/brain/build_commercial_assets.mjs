#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT=new URL('../../../..',import.meta.url);
const PRODUCTS_URL=new URL('data/products.js',ROOT);
const SERVICES_URL=new URL('data/services.js',ROOT);
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
  assets.push({
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
    price_minor:Number.isInteger(s.amount)?s.amount:null,
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
  });
}

assets.sort((a,b)=>a.asset_ref.localeCompare(b.asset_ref));

const payload={
  schema_version:'commercial_assets_v1',
  sources:['data/products.js','data/services.js'],
  contract:{
    derived_projection:true,
    canonical_catalogues_unchanged:true,
    catalogue_in_stock_is_not_counted_inventory:true,
    operational_unknowns_remain_null:true,
    private_inventory_overlay_not_stored_here:true,
    commercial_pii:false
  },
  summary:{
    total:assets.length,
    active_physical_products:assets.filter(x=>x.asset_type==='physical_product'&&x.lifecycle_status==='active').length,
    future_products:assets.filter(x=>x.lifecycle_status==='future').length,
    services:assets.filter(x=>x.asset_type==='service').length,
    b2b_services:assets.filter(x=>x.asset_type==='b2b_service').length
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
