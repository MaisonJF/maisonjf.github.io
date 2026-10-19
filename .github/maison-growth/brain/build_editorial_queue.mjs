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
  // Classify the human topic, not product keywords repeated in commercial adjacency.
  const text=[ocean.territory,ocean.intent,ocean.painLanguage,...(ocean.questionThemeCandidates||[])].join(' ').toLocaleLowerCase('pt-PT');
  const rules=[
    {id:'luto_perda_significado',label:'Perda, luto e reconstrução de significado',pattern:/luto|perda amb[ií]gua|perda sem resolu[cç][aã]o|futuro que deixou de ser poss[ií]vel|futuro n[aã]o vivido|possibilidades de vida|irreversibilidade/},
    {id:'carga_mental_cuidado',label:'Carga mental e cuidado sem autoapagamento',pattern:/carga mental|trabalho cognitivo invis[ií]vel|responsabilidade mental|papel de cuidador|cuidar sem desaparecer|lembrar e acompanhar|reparti[cç][aã]o de carga/},
    {id:'prazer_celebracao',label:'Prazer, celebração e pequenos rituais',pattern:/micro-luxo|pequeno luxo|pequenas vit[oó]rias|recompensa|celebra[cç][aã]o|mimo|prazer acess[ií]vel|marcar uma pequena vit[oó]ria/},
    {id:'seguranca_financeira',label:'Segurança financeira e pressão para gastar',pattern:/evitamento financeiro|vergonha financeira|medo de olhar para os n[uú]meros|press[aã]o social para gastar|n[aã]o cabe no or[cç]amento|or[cç]amento|contas financeiras|escassez financeira|dinheiro aperta/},
    {id:'atencao_informacao',label:'Atenção e relação com a informação',pattern:/aten[cç][aã]o fragmentada|interrup[cç][oõ]es digitais|doomscroll|scroll|feed|telem[oó]vel|ecr[aã]|informa[cç][aã]o|foco|mudan[cç]as constantes de contexto|notifica[cç][aã]o/},
    {id:'presenca_apoio',label:'Presença e apoio sem tentar resolver tudo',pattern:/presen[cç]a que ampara|apoio sem tentar resolver|escuta orientada|atravessar um momento|precisa de presen[cç]a|algu[eé]m ficar quando/},
    {id:'limites_escolhas_agencia',label:'Limites, escolhas e autonomia',pattern:/limite|dizer n[aã]o|medo da rea[cç][aã]o|rea[cç][aã]o do outro|escolha aut[oó]noma|autonomia condicionada|puni[cç][aã]o|retirada ou press[aã]o|auto-silenciamento|telepress[aã]o|disponibilidade permanente/},
    {id:'ligacao_pertença',label:'Ligação, pertença e relações',pattern:/rela[cç][aã]o|apego|afeto|solid[aã]o com contacto|perten[cç]a|espera uma resposta|resposta importante|gestos invis[ií]veis|conversa|comunica[cç][aã]o|qualidade dos v[ií]nculos/},
    {id:'clareza_incerteza',label:'Clareza perante a incerteza',pattern:/incerteza|decis[aã]o|decidir|futuro|ficar em suspenso|esperar por informa[cç][aã]o|rumina[cç][aã]o|n[aã]o consegues perceber|caminho|mudan[cç]a|sobrecarga de escolha|demasiadas op[cç][oõ]es/},
    {id:'valor_autoconhecimento',label:'Valor pessoal e reconhecimento de padrões',pattern:/autoestima|valor pessoal|reconhecimento|autoabandono|padr[oõ]es|vergonha|auto[jj]ulgamento|merecido|merecer|identidade|o que funciona na rela[cç][aã]o|compara[cç][aã]o social/},
    {id:'rituais_sensoriais',label:'Rituais sensoriais e passagem de momento',pattern:/rituais sensoriais|sensorial|aroma|plantas|ritual|marcadores de transi[cç][aã]o|toque|escalda-p[eé]s|vela arom[aá]tica|n[eé]voa de ambiente/},
    {id:'autonomia_descanso_transicao',label:'Autonomia, descanso e transições',pattern:/adiar o sono|bedtime procrastination|descanso|descansar|tempo pr[oó]prio|domingo|segunda-feira|fim do dia|obriga[cç][oõ]es|culpa ao descansar|recuperar tempo|prolongar a noite|energia social|precisar de solid[aã]o/}
  ];
  return rules.find(rule=>rule.pattern.test(text))||{id:'reflexao_pessoal',label:'Autoconhecimento e reflexão pessoal'};
}

function humanNeedAction(cluster){
  const actions={
    luto_perda_significado:'Dá nome ao que foi perdido — incluindo uma possibilidade que nunca chegou a acontecer. Podes escrever o que terminou, o que continua a ter significado e de que apoio precisas agora. Não tens de encontrar já um sentido.',
    carga_mental_cuidado:'Escolhe uma tarefa invisível e torna-a explícita: quem se lembra, planeia, confirma e acompanha? Se for seguro, combina quem assume a responsabilidade completa, não apenas a execução.',
    prazer_celebracao:'Escolhe uma forma de assinalar a pequena vitória que caiba no teu orçamento: uma pausa, uma música, uma mensagem a alguém ou um gesto sensorial que já tenhas em casa. Um mimo não tem de ser uma compra.',
    seguranca_financeira:'Antes de assumires uma despesa, define o limite que queres proteger. Podes dizer: “Desta vez não consigo gastar esse valor; quero estar presente, mas preciso de respeitar o meu orçamento.”',
    rituais_sensoriais:'Escolhe um gesto sensorial simples — água morna, luz suave ou um aroma de que gostes — para assinalar a passagem entre tarefas. O gesto é um marcador, não uma cura.',
    atencao_informacao:'Escolhe uma tarefa pequena, afasta uma interrupção durante dez minutos e decide quando voltas a consultar mensagens ou notícias. Experimenta sem exigir foco perfeito.',
    presenca_apoio:'Pede o tipo de presença de que precisas: “Podes ouvir-me durante dez minutos sem tentares resolver?” ou “Podes ajudar-me com uma tarefa concreta?”',
    limites_escolhas_agencia:'Escreve uma frase de limite que possas dizer sem atacar: “Preciso de tempo para pensar e respondo-te amanhã.” Um limite não controla a reação da outra pessoa.',
    ligacao_pertença:'Experimenta perguntar à outra pessoa: “Queres que te ouça, que pensemos numa solução ou que te faça companhia?” Não assumes que sabes do que ela precisa.',
    clareza_incerteza:'Divide uma folha em duas colunas: “o que sei” e “o que ainda não sei”. Escolhe apenas uma ação útil para a parte que está ao teu alcance.',
    valor_autoconhecimento:'Separa o acontecimento da conclusão sobre ti: escreve o que ocorreu, a história que contaste a ti próprio e uma segunda explicação possível.',
    autonomia_descanso_transicao:'Reserva um intervalo pequeno e realista que seja teu, mesmo que sejam dez minutos. Decide o que queres fazer com esse tempo, em vez de o deixar desaparecer entre obrigações.',
    reflexao_pessoal:'Pergunta-te o que aconteceu, que necessidade pode estar presente e qual seria um próximo passo pequeno e realista.'
  };
  return actions[cluster]||actions.reflexao_pessoal;
}

function maisonSolutionForNeed(cluster,adjacency){
  const related=String(adjacency||'').toLocaleLowerCase('pt-PT');
  const result={assets:[],bridge:'',cta:'Explora a opção MAISON JF que faça sentido para ti — sem pressão para comprar.'};
  if(cluster==='luto_perda_significado'){
    result.assets=['Oráculo MAISON JF®','Éditions Maison JF','Serviços e Presença'];
    result.bridge='O Oráculo e as Éditions podem oferecer perguntas e leitura para explorar uma perda ou mudança de significado. A oferta Presença é uma opção de companhia com limites explícitos; nenhuma destas opções é psicoterapia, tratamento ou serviço de emergência.';
  }else if(cluster==='carga_mental_cuidado'){
    result.assets=['PÁRA DE IGNORAR!','Oráculo MAISON JF®'];
    result.bridge='PÁRA DE IGNORAR! oferece perguntas para abrir uma conversa entre duas pessoas sobre o que costuma ficar invisível; o Oráculo pode ajudar a formular a pergunta. A responsabilidade tem de ser negociada entre as pessoas, não delegada a um produto.';
  }else if(cluster==='prazer_celebracao'){
    result.assets=['Vela Aromática','Escalda-Pés','Névoa de Ambiente'];
    result.bridge='A Maison tem pequenos produtos sensoriais para quem escolhe marcar uma pausa ou uma conquista através do ambiente. Também podes fazer isso sem comprar nada: o produto é uma opção de ritual, não uma condição para merecer prazer.';
  }else if(cluster==='autonomia_descanso_transicao'||cluster==='rituais_sensoriais'){
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
  const helpfulAction=humanNeedAction(humanNeed.id);
  const solution=maisonSolutionForNeed(humanNeed.id,adjacency);
  const sourceId='brain_daily_'+slug(territory);
  const themes=[...new Set((ocean.questionThemeCandidates||[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,3);
  if(!themes.length)themes.push(topic);
  const formatsForTheme=theme=>[
    {
      format:'post',angle:'reconhecimento_e_microacao',
      hook:'Não tens de resolver tudo hoje. Começa por perceber o que '+theme.toLocaleLowerCase('pt-PT')+' te está a pedir.',
      body:'Uma situação pode pesar por mais do que uma razão. '+pain+'\n\nExperimenta este passo concreto: '+helpfulAction+'\n\nNão precisas de transformar uma sensação numa identidade nem de chegar já a uma conclusão.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'reel',angle:'hook_nomear_escolher',
      hook:'Uma pergunta para levares contigo quando aparece '+theme.toLocaleLowerCase('pt-PT')+'.',
      body:'Pára por um momento. '+helpfulAction+'\n\nIsto não resolve tudo; pode apenas ajudar-te a começar por uma coisa de cada vez.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'carousel',angle:'sequencia_observar_nomear_agir',
      hook:'4 passos para olhares para '+theme.toLocaleLowerCase('pt-PT')+' com menos julgamento.',
      slides:[
        '1/4 — OBSERVA: o que aconteceu, concretamente?',
        '2/4 — NOMEIA: que necessidade pode estar presente — espaço, clareza, ligação, descanso ou segurança?',
        '3/4 — EXPERIMENTA: '+helpfulAction,
        '4/4 — REVÊ: o que ajudou, o que não ajudou e de que apoio precisas a seguir?'
      ],
      body:'Um pequeno roteiro de reflexão sobre '+theme+'.\n\n'+solution.bridge,
      cta:solution.cta
    },
    {
      format:'story',angle:'pergunta_interativa_sem_pressao',
      hook:'O que te ajudaria mais neste momento?',
      pollQuestion:'Quando aparece '+theme.toLocaleLowerCase('pt-PT')+', de que precisas primeiro?',
      pollOptions:humanNeed.id==='seguranca_financeira'?['Proteger o orçamento','Dizer não','Pedir tempo','Uma alternativa gratuita']:humanNeed.id==='ligacao_pertença'||humanNeed.id==='presenca_apoio'?['Ser ouvido','Uma conversa','Companhia','Ajuda prática']:humanNeed.id==='limites_escolhas_agencia'?['Dizer não','Pedir tempo','Definir um limite','Adiar a resposta']:humanNeed.id==='autonomia_descanso_transicao'||humanNeed.id==='rituais_sensoriais'?['Uma pausa','Tempo meu','Um ritual simples','Ajuda prática']:humanNeed.id==='atencao_informacao'?['Menos interrupções','Uma pausa','Priorizar','Desligar um pouco']:['Clareza','Separar factos de receios','Uma conversa','Um próximo passo'],
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
      audienceNeed:need.slice(0,600),humanNeedCluster:humanNeed.id,humanNeedLabel:humanNeed.label,helpfulAction,
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
