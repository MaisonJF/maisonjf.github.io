#!/usr/bin/env node
import fs from 'node:fs';

const HERE=new URL('.',import.meta.url);
const QUEUE=new URL('editorial-queue.json',HERE);
const ASSETS=new URL('commercial-assets.generated.json',HERE);
const OUTPUT=new URL('digital-experience-coverage.generated.json',HERE);
const CHECK=process.argv.includes('--check');

const queue=JSON.parse(fs.readFileSync(QUEUE,'utf8'));
const registry=JSON.parse(fs.readFileSync(ASSETS,'utf8'));

const byRef=new Map((registry.assets||[]).map(x=>[x.asset_ref,x]));
const oracleAsset=byRef.get('catalog:digital:oracle');
const pdiAsset=byRef.get('catalog:digital:pdi');
if(!oracleAsset||!pdiAsset)throw new Error('digital_product_assets_missing');

const questionItems=new Map();
const oracleItems=new Map();
for(const item of queue.items||[]){
  const territory=String(item.sourceOceanId||item.territory||'').trim();
  if(!territory)continue;
  if(item.type==='question_candidate')questionItems.set(territory,item);
  if(item.type==='oracle_candidate')oracleItems.set(territory,item);
}

const territories=[...new Set([...questionItems.keys(),...oracleItems.keys()])].sort();
const rows=territories.map(territory=>{
  const q=questionItems.get(territory)||null;
  const o=oracleItems.get(territory)||null;
  const themes=q?.questionThemeCandidates||[];
  const stages=q?.stageCandidates||[];
  const questionSlots=q?.questionDesignSlots||[];
  const roles=o?.roleCandidates||[];
  const gaps=[];
  if(!q)gaps.push('pdi_feed_missing');
  if(!o)gaps.push('oracle_feed_missing');
  if(q&&questionSlots.length!==themes.length*stages.length)gaps.push('pdi_slot_contract_mismatch');
  if(o&&roles.length!==7)gaps.push('oracle_role_contract_mismatch');
  return {
    territory,
    pdi:{
      asset_ref:pdiAsset.asset_ref,
      eligible:Boolean(q),
      theme_hypotheses:themes.length,
      stage_slots:questionSlots.length,
      stages,
      approval_required:q?.approvalRequired===true,
      automatic_activation:q?.automaticActivation===true,
      paid_body_stored:q?.bodyStored===true
    },
    oracle:{
      asset_ref:oracleAsset.asset_ref,
      eligible:Boolean(o),
      role_slots:roles.length,
      roles,
      approval_required:o?.approvalRequired===true,
      automatic_activation:o?.automaticActivation===true,
      paid_body_stored:o?.bodyStored===true
    },
    gaps
  };
});

const out={
  schema_version:'digital_experience_coverage_v1',
  visibility:'internal_brain',
  sources:['editorial-queue.json','commercial-assets.generated.json'],
  contract:{
    paid_bodies_stored:false,
    automatic_publication:false,
    automatic_activation:false,
    human_editorial_approval_required:true,
    ocean_metadata_is_not_external_evidence:true,
    product_availability_does_not_bypass_checkout_or_editorial_gates:true
  },
  products:{
    oracle:{
      asset_ref:oracleAsset.asset_ref,
      price_minor:oracleAsset.price_minor,
      currency:oracleAsset.currency,
      territory_source_count:oracleAsset.content_system?.territory_count??null,
      feed:'oracle_candidate',
      roles:oracleAsset.content_system?.roles||[]
    },
    pdi:{
      asset_ref:pdiAsset.asset_ref,
      price_minor:pdiAsset.price_minor,
      currency:pdiAsset.currency,
      source_theme_count:pdiAsset.content_system?.source_theme_count??null,
      feed:'question_candidate',
      stages:pdiAsset.content_system?.stages||[]
    }
  },
  summary:{
    oceans:territories.length,
    pdi_oceans:rows.filter(x=>x.pdi.eligible).length,
    oracle_oceans:rows.filter(x=>x.oracle.eligible).length,
    pdi_theme_hypotheses:rows.reduce((n,x)=>n+x.pdi.theme_hypotheses,0),
    pdi_stage_slots:rows.reduce((n,x)=>n+x.pdi.stage_slots,0),
    oracle_role_slots:rows.reduce((n,x)=>n+x.oracle.role_slots,0),
    oceans_with_feed_gaps:rows.filter(x=>x.gaps.length).length
  },
  oceans:rows
};

for(const row of rows){
  if(row.pdi.paid_body_stored||row.oracle.paid_body_stored)throw new Error('paid_body_contract_violation:'+row.territory);
  if(row.pdi.automatic_activation||row.oracle.automatic_activation)throw new Error('automatic_activation_contract_violation:'+row.territory);
}

const rendered=JSON.stringify(out,null,2)+'\n';
if(CHECK){
  const current=fs.readFileSync(OUTPUT,'utf8');
  if(current!==rendered)throw new Error('digital_experience_coverage_out_of_sync');
  console.log(`Digital experience coverage: OK · ${out.summary.oceans} Oceans · ${out.summary.oceans_with_feed_gaps} feed gaps`);
}else{
  fs.writeFileSync(OUTPUT,rendered);
  console.log(JSON.stringify(out.summary));
}
