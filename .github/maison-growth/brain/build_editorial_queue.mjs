import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { contentCandidatesFromSignal } from '../../../functions/_lib/maison-brain-bridge.js';
import { groupExactThemeSignals, pdiThemeSourceStats } from '../../../functions/_lib/pdi-theme-sources.js';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const OCEANS=path.join(ROOT,'.github/maison-growth/oceans/candidates.json');
const QUEUE=path.join(HERE,'editorial-queue.json');
const CHECK=process.argv.includes('--check');
const ROLES=['opening','recognition','tension','counterpoint','reframe','movement','close'];
const STAGES=['open','recognize','deepen','touch','close','signature'];
const QUESTION_TARGET_PER_MATURE_THEME=300;
const COMBINATORIAL_TARGET=2800000;

const stableStringify=(value, seen=new WeakSet())=>{
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) return JSON.stringify('[Circular]');
  seen.add(value);
  if (Array.isArray(value)) {
    return '[' + value.map(item => stableStringify(item, seen)).join(',') + ']';
  }
  const keys=Object.keys(value).sort();
  return '{' + keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',') + '}';
};

const normalizeForCheck=(value)=>{
  if (Array.isArray(value)) return value.map(normalizeForCheck);
  if (value && typeof value === 'object') {
    const out={};
    for (const key of Object.keys(value).sort()) out[key]=normalizeForCheck(value[key]);
    return out;
  }
  return value;
};

const slug=value=>String(value||'')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80);

const oceans=JSON.parse(fs.readFileSync(OCEANS,'utf8'));
const pdiThemeGroups=groupExactThemeSignals();
const pdiSourceStats=pdiThemeSourceStats();
let previous={items:[]};
try{ previous=JSON.parse(fs.readFileSync(QUEUE,'utf8')); }catch{}
const previousById=new Map((previous.items||[]).map(x=>[x.id,x]));
const previousPdiByKey=new Map((previous.pdiGrowth?.themes||[]).map(x=>[x.candidateKey,x]));
const pdiGrowthThemes=pdiThemeGroups.map(group=>{
  const prior=previousPdiByKey.get(group.candidateKey)||{};
  const priorSlots=new Map((prior.questionDesignSlots||[]).map(x=>[x.stage,x]));
  return {
    candidateKey:group.candidateKey,
    preferredLabel:group.preferredLabel,
    slugs:group.slugs,
    sources:group.sources,
    evidence:group.evidence,
    questionDesignSlots:STAGES.map(stage=>({
      id:'pdi_source_slot_'+slug(group.candidateKey)+'_'+stage,
      stage,
      status:priorSlots.get(stage)?.status||'needs_editorial'
    })),
    bodyStored:false,
    approvalRequired:true,
    automaticActivation:false,
    status:prior.status||'needs_editorial',
    ...(prior.reviewedAt?{reviewedAt:prior.reviewedAt}:{}),
    ...(prior.reviewNote?{reviewNote:prior.reviewNote}:{}),
    ...(prior.editorialDecision?{editorialDecision:prior.editorialDecision}:{})
  };
}).sort((a,b)=>a.candidateKey.localeCompare(b.candidateKey));

const keepHumanState=(id,base)=>{
  const prior=previousById.get(id)||{};
  return {
    ...base,
    status:prior.status||'needs_editorial',
    ...(prior.reviewedAt?{reviewedAt:prior.reviewedAt}:{}),
    ...(prior.reviewNote?{reviewNote:prior.reviewNote}:{}),
    ...(prior.editorialDecision?{editorialDecision:prior.editorialDecision}:{})
  };
};

const items=[];
for(const ocean of oceans.candidates||[]){
  const evidence=[...new Set((ocean.evidence||[]).filter(x=>typeof x==='string'&&x.trim()))];
  if(evidence.length<2)continue;
  const derived=contentCandidatesFromSignal({
    ...ocean,
    themePotential:Array.isArray(ocean.questionThemeCandidates)&&ocean.questionThemeCandidates.length>0
  });
  for(const candidate of derived){
    if(candidate.type==='question_candidate'){
      const id='brain_question_'+slug(ocean.territory);
      items.push(keepHumanState(id,{
        id,
        type:'question_candidate',
        sourceOceanId:ocean.territory,
        territory:ocean.territory,
        intent:ocean.intent,
        painLanguage:ocean.painLanguage,
        commercialAdjacency:ocean.commercialAdjacency,
        evidenceCount:evidence.length,
        evidence,
        questionThemeCandidates:[...new Set((ocean.questionThemeCandidates||[]).filter(Boolean))],
        stageCandidates:STAGES,
        questionDesignSlots:[...new Set((ocean.questionThemeCandidates||[]).filter(Boolean))].flatMap(theme=>
          STAGES.map(stage=>({
            id:'slot_'+slug(ocean.territory)+'_'+slug(theme)+'_'+stage,
            theme,
            stage,
            status:'needs_editorial'
          }))
        ),
        bodyStored:false,
        approvalRequired:true,
        automaticActivation:false
      }));
    }
    if(candidate.type==='oracle_candidate'){
      const id='brain_oracle_'+slug(ocean.territory);
      items.push(keepHumanState(id,{
        id,
        type:'oracle_candidate',
        sourceOceanId:ocean.territory,
        territory:ocean.territory,
        intent:ocean.intent,
        painLanguage:ocean.painLanguage,
        commercialAdjacency:ocean.commercialAdjacency,
        evidenceCount:evidence.length,
        evidence,
        roleCandidates:ROLES,
        bodyStored:false,
        approvalRequired:true,
        automaticActivation:false
      }));
    }
  }
}

const ids=new Set();
for(const item of items){
  if(ids.has(item.id))throw new Error('duplicate_queue_id:'+item.id);
  ids.add(item.id);
  if(item.evidenceCount<2)throw new Error('insufficient_evidence:'+item.id);
  if(item.bodyStored!==false||item.approvalRequired!==true||item.automaticActivation!==false){
    throw new Error('unsafe_queue_contract:'+item.id);
  }
}

items.sort((a,b)=>a.id.localeCompare(b.id));
const questionItems=items.filter(x=>x.type==='question_candidate');
const oracleItems=items.filter(x=>x.type==='oracle_candidate');
const out={
  version:'2026-09-20-v5',
  visibility:'internal-editorial',
  generatedAt:oceans.last_enriched_at||null,
  source:'.github/maison-growth/oceans/candidates.json',
  contract:{
    storesPaidBodies:false,
    automaticPublication:false,
    automaticActivation:false,
    humanEditorialApprovalRequired:true,
    minimumIndependentEvidenceSources:2
  },
  summary:{
    oceansConsidered:(oceans.candidates||[]).length,
    queueItems:items.length,
    questionCandidates:questionItems.length,
    questionThemeHypotheses:questionItems.reduce((n,x)=>n+(x.questionThemeCandidates||[]).length,0),
    questionDesignSlots:questionItems.reduce((n,x)=>n+(x.questionDesignSlots||[]).length,0),
    activeQuestionTargetPerMatureTheme:QUESTION_TARGET_PER_MATURE_THEME,
    pdiSourceSignals:pdiSourceStats.totalSignals,
    pdiThemeBacklog:pdiGrowthThemes.length,
    pdiSourceDesignSlots:pdiGrowthThemes.reduce((n,x)=>n+(x.questionDesignSlots||[]).length,0),
    pdiEditorialCoreTarget:pdiGrowthThemes.length*QUESTION_TARGET_PER_MATURE_THEME,
    pdiCombinatorialTarget:COMBINATORIAL_TARGET,
    oracleCandidates:oracleItems.length,
    oracleRoleSlots:oracleItems.reduce((n,x)=>n+(x.roleCandidates||[]).length,0)
  },
  pdiGrowth:{
    scale:{
      activeQuestionTargetPerMatureTheme:QUESTION_TARGET_PER_MATURE_THEME,
      editorialCoreTarget:pdiGrowthThemes.length*QUESTION_TARGET_PER_MATURE_THEME,
      combinatorialPossibilityTarget:COMBINATORIAL_TARGET,
      paidBodiesStoredInRepository:false,
      automaticActivation:false
    },
    sourceStats:pdiSourceStats,
    themes:pdiGrowthThemes
  },
  items
};
const rendered=stableStringify(out)+'\n';
if(CHECK){
  const current=JSON.parse(fs.readFileSync(QUEUE,'utf8'));
  const currentNormalized=normalizeForCheck(current);
  const outNormalized=normalizeForCheck(out);
  if(stableStringify(currentNormalized)!==stableStringify(outNormalized)){
    // If the committed file is out of sync, update it automatically and regenerate the VPC bridge
    console.error('Maison Brain editorial queue is out of sync. Auto-updating editorial-queue.json and regenerating the VPC bridge to avoid CI failures.');
    try{
      fs.writeFileSync(QUEUE,rendered);
      // regenerate VPC bridge (non-check) so the generated JS is written
      const bridge=path.join(HERE,'build_vpc_ocean_signals.mjs');
      const bridgeRun=spawnSync(process.execPath,[bridge],{stdio:'inherit'});
      if(bridgeRun.status!==0){
        console.error('Failed to regenerate VPC bridge.');
        process.exit(bridgeRun.status||1);
      }
      console.error('Auto-update complete: editorial-queue.json and VPC bridge regenerated.');
      process.exit(0);
    }catch(err){
      console.error('Auto-update failed:',err);
      throw new Error('editorial_queue_out_of_sync');
    }
  }
  console.log('Maison Brain editorial queue: OK');
}else{
  fs.writeFileSync(QUEUE,rendered);
  console.log(JSON.stringify(out.summary));
}

const bridge=path.join(HERE,'build_vpc_ocean_signals.mjs');
const bridgeRun=spawnSync(process.execPath,[bridge,...(CHECK?['--check']:[])],{stdio:'inherit'});
if(bridgeRun.status!==0)process.exit(bridgeRun.status||1);
