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
    const result='[' + value.map(item => stableStringify(item, seen)).join(',') + ']';
    seen.delete(value);
    return result;
  }
  const keys=Object.keys(value).sort();
  const result='{' + keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',') + '}';
  seen.delete(value);
  return result;
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

const humanizeTerritory=value=>String(value||'').split(/[-_]+/).filter(Boolean).map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
const previousEbookById=new Map((previous.ebookProposals||[]).map(x=>[x.id,x]));
const ebookProposals=(oceans.candidates||[]).flatMap(ocean=>{
  const evidence=[...new Set((ocean.evidence||[]).filter(x=>typeof x==='string'&&x.trim()))];
  const adjacency=String(ocean.commercialAdjacency||'');
  const topicText=[ocean.territory,ocean.intent,ocean.painLanguage,adjacency].join(' ');
  const internalOperations=/(dna maison|princ[ií]pios transfer[ií]veis|mestres hist[oó]ricos|aquisi[cç][aã]o org[aâ]nica|reconhecimento da maison|tr[aá]fego qualificado|estrat[eé]gia comercial da maison)/i.test(topicText);
  if(evidence.length<2||internalOperations||!/(ebook|e-book|guia|digital|experi[eê]ncias digitais|conte[uú]do digital|produto digital)/i.test(adjacency))return [];
  const id='brain_ebook_'+slug(ocean.territory);
  const prior=previousEbookById.get(id)||{};
  const topic=humanizeTerritory(ocean.territory);
  return [{
    id,
    type:'ebook_proposal',
    sourceOceanId:ocean.territory,
    territory:ocean.territory,
    workingTitle:'Guia MAISON JF: '+topic,
    readerNeed:String(ocean.intent||'').slice(0,500),
    editorialAngle:String(ocean.painLanguage||'').slice(0,500),
    commercialAdjacency:adjacency.slice(0,800),
    evidenceCount:evidence.length,
    evidence,
    proposedOutline:[
      {chapter:1,role:'compreender_o_tema',brief:'Contextualizar o tema sem o transformar num diagnóstico.'},
      {chapter:2,role:'reconhecer_padroes',brief:'Distinguir situações, necessidades e sinais observáveis.'},
      {chapter:3,role:'perguntas_de_reflexao',brief:'Exercícios e perguntas originais para reflexão pessoal.'},
      {chapter:4,role:'experiencias_pequenas',brief:'Experiências práticas de baixo risco, sem promessas clínicas.'},
      {chapter:5,role:'integracao_no_quotidiano',brief:'Plano de continuidade e recursos MAISON JF relevantes, sem pressão comercial.'}
    ],
    relatedDigitalExperiences:['PÁRA DE IGNORAR!','Oráculo MAISON JF'],
    status:prior.status||'needs_editorial',
    ...(prior.reviewedAt?{reviewedAt:prior.reviewedAt}:{}),
    ...(prior.reviewNote?{reviewNote:prior.reviewNote}:{}),
    bodyStored:false,
    approvalRequired:true,
    automaticPublication:false,
    automaticActivation:false
  }];
}).sort((a,b)=>a.id.localeCompare(b.id));

for(const proposal of ebookProposals){
  if(proposal.evidenceCount<2)throw new Error('insufficient_ebook_evidence:'+proposal.id);
  if(proposal.bodyStored!==false||proposal.approvalRequired!==true||proposal.automaticPublication!==false||proposal.automaticActivation!==false){
    throw new Error('unsafe_ebook_proposal_contract:'+proposal.id);
  }
}

const previousDailyById=new Map((previous.dailyContentCandidates||[]).map(x=>[x.id,x]));
const dailyContentCandidates=(oceans.candidates||[]).flatMap(ocean=>{
  const evidence=[...new Set((ocean.evidence||[]).filter(x=>typeof x==='string'&&x.trim()))];
  if(evidence.length<2)return [];
  const territory=String(ocean.territory||'').trim();
  if(!territory)return [];
  const topic=humanizeTerritory(territory);
  const need=String(ocean.intent||'').trim();
  const pain=String(ocean.painLanguage||'').trim();
  const adjacency=String(ocean.commercialAdjacency||'').trim();
  const sourceId='brain_daily_'+slug(territory);
  const relatedAssets=[];
  if(/p[aá]ra de ignorar|jogo|perguntas|decis[oõ]es|aten[cç][aã]o/i.test(adjacency))relatedAssets.push('PÁRA DE IGNORAR!');
  if(/or[aá]culo|tarot|rela[cç][oõ]es|padr[oõ]es|caminho/i.test(adjacency))relatedAssets.push('Oráculo MAISON JF®');
  if(/vela|aroma|n[eé]voa|ritual|escalda-p[eé]s|sensorial/i.test(adjacency))relatedAssets.push('Rituais sensoriais MAISON JF');
  if(/ebook|e-book|guia|digital|conte[uú]do digital/i.test(adjacency))relatedAssets.push('Éditions Maison JF');
  if(!relatedAssets.length)relatedAssets.push('Explorar a oferta MAISON JF');
  const themes=[...new Set((ocean.questionThemeCandidates||[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,3);
  if(!themes.length)themes.push(topic);
  const formatsForTheme=theme=>[
    {format:'post',angle:'reconhecimento_e_reflexao',hook:'E se '+theme.toLocaleLowerCase('pt-PT')+' fosse uma necessidade a compreender, em vez de mais uma coisa para te julgares?',body:'Há momentos em que '+pain.charAt(0).toLocaleLowerCase('pt-PT')+pain.slice(1)+'\n\nQuando este tema aparece, experimenta perguntar: o que preciso agora — clareza, espaço, descanso, uma conversa ou um próximo passo pequeno?\n\nNão há uma resposta universal. Começa por observar o que se passa contigo, sem te obrigares a chegar já a uma conclusão.',cta:'Se quiseres explorar este tema com a MAISON JF, descobre: '+relatedAssets[0]+'.'},
    {format:'reel',angle:'hook_pergunta_mais_microacao',hook:'Antes de reagires a '+theme.toLocaleLowerCase('pt-PT')+', faz esta pergunta.',body:'O que aconteceu? O que precisavas naquele momento? Qual seria um pequeno passo ao teu alcance — sem resolver a vida inteira hoje?\n\nUma pergunta honesta pode abrir espaço para uma escolha mais consciente. Guarda este vídeo para voltares a estas perguntas quando te fizerem sentido.',cta:'Explora a experiência MAISON JF relacionada: '+relatedAssets[0]+'.'}
  ];
  return themes.flatMap(theme=>formatsForTheme(theme).map(item=>{
    const id=sourceId+'_'+slug(theme)+'_'+item.format;
    const prior=previousDailyById.get(id)||{};
    return {
      id,type:'daily_content_candidate',format:item.format,sourceOceanId:territory,territory,theme,
      workingTitle:topic+' — '+theme+' — '+(item.format==='reel'?'Reel':'Post'),
      audienceNeed:need.slice(0,600),editorialAngle:item.angle,hook:item.hook,body:item.body,cta:item.cta,
      relatedAssets,evidenceCount:evidence.length,evidence,
      status:prior.status||'needs_editorial',
      ...(prior.reviewedAt?{reviewedAt:prior.reviewedAt}:{}),
      ...(prior.reviewNote?{reviewNote:prior.reviewNote}:{}),
      draftOnly:true,approvalRequired:true,automaticPublication:false,automaticActivation:false
    };
  }))
}).sort((a,b)=>a.id.localeCompare(b.id));

for(const draft of dailyContentCandidates){
  if(draft.evidenceCount<2||!draft.hook||!draft.body||!draft.cta)throw new Error('daily_content_quality_gate:'+draft.id);
  if(draft.draftOnly!==true||draft.approvalRequired!==true||draft.automaticPublication!==false||draft.automaticActivation!==false){
    throw new Error('unsafe_daily_content_contract:'+draft.id);
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
    oracleRoleSlots:oracleItems.reduce((n,x)=>n+(x.roleCandidates||[]).length,0),
    ebookProposals:ebookProposals.length,
    ebookProposalsRequiringEditorialApproval:ebookProposals.filter(x=>x.approvalRequired).length,
    dailyContentCandidates:dailyContentCandidates.length,
    dailyPostCandidates:dailyContentCandidates.filter(x=>x.format==='post').length,
    dailyReelCandidates:dailyContentCandidates.filter(x=>x.format==='reel').length,
    dailyContentRequiringEditorialApproval:dailyContentCandidates.filter(x=>x.approvalRequired).length
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
  items,
  ebookProposals,
  dailyContentCandidates
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
