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
function classifyHumanNeed(ocean){
  const text=[ocean.territory,ocean.intent,ocean.painLanguage,ocean.commercialAdjacency,...(ocean.questionThemeCandidates||[])].join(' ').toLocaleLowerCase('pt-PT');
  const rules=[
    {id:'autonomia_descanso_transicao',label:'Autonomia, descanso e transições',pattern:/adiar o sono|descanso|descansar|tempo pr[oó]prio|autonomia|domingo|segunda-feira|transi[cç][aã]o|fim do dia|obriga[cç][oõ]es|culpa ao descansar|recuperar tempo/},
    {id:'limites_escolhas_agencia',label:'Limites, escolhas e autonomia',pattern:/limite|dizer n[aã]o|medo da rea[cç][aã]o|rea[cç][aã]o do outro|press[aã]o social|escolha aut[oó]noma|controlo|controle|autonomia condicionada/},
    {id:'ligacao_pertença',label:'Ligação, pertença e relações',pattern:/rela[cç][aã]o|apego|afeto|afeto|solid[aã]o|companhia|perten[cç]a|espera uma resposta|resposta importante|gestos invis[ií]veis|presen[cç]a que ampara|conversa|comunica[cç][aã]o/},
    {id:'clareza_incerteza',label:'Clareza perante a incerteza',pattern:/incerteza|incertezas|decis[aã]o|decidir|futuro|suspenso|esperar|rumina[cç][aã]o|n[aã]o consegues perceber|caminho|mudan[cç]a/},
    {id:'atencao_informacao',label:'Atenção e relação com a informação',pattern:/aten[cç][aã]o|fragmentada|interrup[cç][oõ]es digitais|doomscroll|scroll|feed|telem[oó]vel|ecr[aã]|informa[cç][aã]o|foco/},
    {id:'valor_autoconhecimento',label:'Valor pessoal e reconhecimento de padrões',pattern:/autoestima|valor pessoal|reconhecimento|autoabandono|padr[oõ]es|vergonha|auto[jj]ulgamento|merecido|merecer|identidade/},
    {id:'seguranca_financeira',label:'Segurança financeira e pressão para gastar',pattern:/dinheiro|financeir|gastar|gasto|consumo|or[cç]amento|vergonha de dizer n[aã]o|press[aã]o.*gastar/},
    {id:'rituais_sensoriais',label:'Rituais sensoriais e passagem de momento',pattern:/sensorial|aroma|plantas|ritual|casa|corpo|marcadores de transi[cç][aã]o|gesto|toque|pausa/},
    {id:'presenca_apoio',label:'Presença e apoio sem tentar resolver tudo',pattern:/ampara|apoio|escuta|presen[cç]a|acompanhar|companhia|atravessar um momento/}
  ];
  return rules.find(rule=>rule.pattern.test(text))||{id:'reflexao_pessoal',label:'Autoconhecimento e reflexão pessoal'};
}

function maisonSolutionForNeed(cluster,adjacency){
  const related=String(adjacency||'').toLocaleLowerCase('pt-PT');
  const result={assets:[],bridge:'',cta:'Explora a opção MAISON JF que faça sentido para ti — sem pressão para comprar.'};
  if(cluster==='autonomia_descanso_transicao'||cluster==='rituais_sensoriais'){
    result.assets=['Escalda-Pés','Vela Aromática','Névoa de Ambiente'];
    result.bridge='A MAISON JF oferece pequenos objetos e rituais sensoriais que podem marcar uma pausa ou a passagem entre momentos do dia. São gestos de ambiente e autocuidado, não tratamentos nem soluções para problemas de saúde.';
  }else if(cluster==='limites_escolhas_agencia'){
    result.assets=['PÁRA DE IGNORAR!','Oráculo MAISON JF®'];
    result.bridge='PÁRA DE IGNORAR! abre espaço para perguntas entre duas pessoas; o Oráculo oferece perguntas simbólicas para explorar escolhas e limites. Nenhum deles decide por ti ou garante a reação de outra pessoa.';
  }else if(cluster==='ligacao_pertença'){
    result.assets=['PÁRA DE IGNORAR!','Oráculo MAISON JF®','Serviços e Presença'];
    result.bridge='PÁRA DE IGNORAR! propõe perguntas para iniciar conversas; o Oráculo ajuda a explorar outra perspetiva. A oferta Presença pode ser considerada quando procuras companhia humana, respeitando os limites descritos no serviço.';
  }else if(cluster==='clareza_incerteza'){
    result.assets=['Oráculo MAISON JF®','Consulta de Tarot','Éditions Maison JF'];
    result.bridge='O Oráculo e a Consulta de Tarot são formatos de reflexão sobre uma pergunta, sem prever resultados nem decidir por ti. As Éditions permitem explorar temas através da leitura e da escrita.';
  }else if(cluster==='atencao_informacao'){
    result.assets=['Oráculo MAISON JF®','Éditions Maison JF','Volta Para Casa'];
    result.bridge='A Maison pode oferecer uma pergunta para interromper o piloto automático, conteúdos para explorar padrões e um ritual sensorial para assinalar uma pausa. Nada disto substitui apoio profissional quando necessário.';
  }else if(cluster==='valor_autoconhecimento'){
    result.assets=['Oráculo MAISON JF®','PÁRA DE IGNORAR!','Éditions Maison JF'];
    result.bridge='O Oráculo, o jogo de perguntas e as Éditions MAISON JF oferecem diferentes formas de refletir, escrever e conversar. São ferramentas de exploração, não diagnósticos nem promessas de transformação.';
  }else if(cluster==='seguranca_financeira'){
    result.assets=['Pergunta de reflexão gratuita','PÁRA DE IGNORAR!'];
    result.bridge='Neste tema, a primeira ajuda tem de ser gratuita: nomeia o limite que queres respeitar e experimenta uma frase para dizer não. Só considera um produto pago se ele te fizer sentido e couber no teu orçamento.';
    result.cta='Guarda esta pergunta e usa-a gratuitamente. Não precisas de comprar nada para começares a definir um limite.';
  }else if(cluster==='presenca_apoio'){
    result.assets=['Serviços e Presença','Oráculo MAISON JF®'];
    result.bridge='A oferta Presença é uma opção de companhia com limites explícitos; o Oráculo pode ajudar a organizar uma pergunta. Nenhum é um serviço de emergência nem substitui apoio clínico.';
  }else{
    result.assets=['Oráculo MAISON JF®','Éditions Maison JF','PÁRA DE IGNORAR!'];
    result.bridge='A Maison JF reúne perguntas simbólicas, experiências de conversa e conteúdos editoriais para explorar necessidades e perspetivas. Escolhe apenas o formato que realmente te é útil.';
  }
  // If the Ocean already names a clear commercial fit, put that fit first only when
  // it is a known Maison asset; otherwise retain the need-first mapping above.
  const known=['PÁRA DE IGNORAR!','Oráculo MAISON JF®','Éditions Maison JF','Serviços e Presença','Escalda-Pés','Vela Aromática','Névoa de Ambiente','Consulta de Tarot','Volta Para Casa'];
  const named=known.find(asset=>related.includes(asset.toLocaleLowerCase('pt-PT')));
  if(named&&result.assets.includes(named))result.assets=[named,...result.assets.filter(x=>x!==named)];
  return result;
}

const dailyContentCandidates=(oceans.candidates||[]).flatMap(ocean=>{
  const evidence=[...new Set((ocean.evidence||[]).filter(x=>typeof x==='string'&&x.trim()))];
  if(evidence.length<2)return [];
  const territory=String(ocean.territory||'').trim();
  if(!territory)return [];
  const topic=humanizeTerritory(territory);
  const need=String(ocean.intent||'').trim();
  const pain=String(ocean.painLanguage||'').trim();
  const adjacency=String(ocean.commercialAdjacency||'').trim();
  const internalOperations=/(dna maison|princ[ií]pios transfer[ií]veis|mestres hist[oó]ricos|aquisi[cç][aã]o org[aâ]nica|reconhecimento da maison|tr[aá]fego qualificado|estrat[eé]gia comercial da maison)/i.test([territory,need,pain,adjacency].join(' '));
  if(internalOperations)return [];
  const humanNeed=classifyHumanNeed(ocean);
  const solution=maisonSolutionForNeed(humanNeed.id,adjacency);
  const sourceId='brain_daily_'+slug(territory);
  const themes=[...new Set((ocean.questionThemeCandidates||[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,3);
  if(!themes.length)themes.push(topic);
  const formatsForTheme=theme=>[
    {
      format:'post',angle:'reconhecimento_e_microacao',
      hook:'Não tens de resolver tudo hoje. Começa por perceber o que '+theme.toLocaleLowerCase('pt-PT')+' te está a pedir.',
      body:'Uma situação pode pesar por mais do que uma razão. '+pain+'\n\nExperimenta três passos: dá um nome ao que está a acontecer; pergunta-te de que precisas; escolhe uma ação pequena e realista para hoje. Não precisas de transformar uma sensação numa identidade nem de chegar já a uma conclusão.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'reel',angle:'hook_nomear_escolher',
      hook:'Uma pergunta para levares contigo quando aparece '+theme.toLocaleLowerCase('pt-PT')+'.',
      body:'Pára por um momento. O que aconteceu, sem interpretações? O que sentiste ou precisaste? Qual é o próximo passo mais pequeno que está ao teu alcance?\n\nIsto não resolve tudo; pode apenas ajudar-te a começar por uma coisa de cada vez.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'carousel',angle:'sequencia_observar_nomear_agir',
      hook:'4 passos para olhares para '+theme.toLocaleLowerCase('pt-PT')+' com menos julgamento.',
      slides:[
        '1/4 — OBSERVA: o que aconteceu, concretamente?',
        '2/4 — NOMEIA: que necessidade pode estar presente — espaço, clareza, ligação, descanso ou segurança?',
        '3/4 — ESCOLHE: que passo pequeno e realista podes experimentar, sem te exigires uma mudança total?',
        '4/4 — REVÊ: o que ajudou, o que não ajudou e de que apoio precisas a seguir?'
      ],
      body:'Um pequeno roteiro de reflexão sobre '+theme+'.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'story',angle:'pergunta_interativa_sem_pressao',
      hook:'O que te ajudaria mais neste momento?',
      pollQuestion:'Quando aparece '+theme.toLocaleLowerCase('pt-PT')+', de que precisas primeiro?',
      pollOptions:['Clareza','Espaço ou descanso','Uma conversa','Um próximo passo'],
      body:'Não existe uma resposta certa para toda a gente. Escolhe a opção que mais se aproxima do que precisas hoje — ou ignora a pergunta se não te servir.',
      cta:solution.cta
    }
  ];
  return themes.flatMap(theme=>formatsForTheme(theme).map(item=>{
    const id=sourceId+'_'+slug(theme)+'_'+item.format;
    const prior=previousDailyById.get(id)||{};
    return {
      id,type:'daily_content_candidate',format:item.format,sourceOceanId:territory,territory,theme,
      workingTitle:topic+' — '+theme+' — '+({post:'Post',reel:'Reel',carousel:'Carrossel',story:'Story'}[item.format]),
      audienceNeed:need.slice(0,600),humanNeedCluster:humanNeed.id,humanNeedLabel:humanNeed.label,
      editorialAngle:item.angle,hook:item.hook,body:item.body,
      ...(item.slides?{slides:item.slides}:{}),
      ...(item.pollQuestion?{pollQuestion:item.pollQuestion,pollOptions:item.pollOptions}:{}),
      maisonSolutionAssets:solution.assets,solutionRationale:solution.bridge,cta:item.cta,
      evidenceCount:evidence.length,evidence,
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
    dailyCarouselCandidates:dailyContentCandidates.filter(x=>x.format==='carousel').length,
    dailyStoryCandidates:dailyContentCandidates.filter(x=>x.format==='story').length,
    dailyHumanNeedClusters:[...new Set(dailyContentCandidates.map(x=>x.humanNeedCluster))].length,
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
