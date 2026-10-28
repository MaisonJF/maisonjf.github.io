#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPdiThemeSourceSignals, groupExactThemeSignals, PDI_GROUP_QUESTION_REUSE } from '../../../functions/_lib/pdi-theme-sources.js';
import { ORACLE_TERRITORIES } from '../../../functions/_lib/oracle-territories.js';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUTPUT=path.join(HERE,'pdi-expansion-queue.generated.json');
const CHECK=process.argv.includes('--check');
const ROLES=['opening','recognition','tension','counterpoint','reframe','movement','close'];
const STAGES=['open','recognize','deepen','touch','close','signature'];
const slug=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,90);
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const stable=value=>JSON.stringify(value,null,2)+'\n';
const readPrevious=()=>{try{return JSON.parse(fs.readFileSync(OUTPUT,'utf8'))}catch{return {questions:[],oracleRoleBriefs:[],bookConceptIdeas:[]}}};
const previous=readPrevious();
const priorById=new Map([...(previous.questions||[]),...(previous.oracleRoleBriefs||[]),...(previous.bookConceptIdeas||[])].map(x=>[x.id,x]));
const preserve=(id,base)=>{const old=priorById.get(id)||{};return {...base,status:old.status||'needs_editorial',...(old.reviewedAt?{reviewedAt:old.reviewedAt}:{}),...(old.reviewNote?{reviewNote:old.reviewNote}:{})}};

const signals=buildPdiThemeSourceSignals();
const themes=groupExactThemeSignals(signals).sort((a,b)=>a.candidateKey.localeCompare(b.candidateKey));
const duoTemplates=[
  (t)=>'Quando surge o tema de '+t.toLocaleLowerCase('pt-PT')+', o que gostarias que eu percebesse sem teres de repetir?',
  (t)=>'Que gesto concreto poderia tornar o tema de '+t.toLocaleLowerCase('pt-PT')+' mais leve entre nós?',
  (t)=>'O que é fácil interpretar mal quando falamos sobre '+t.toLocaleLowerCase('pt-PT')+'?',
  (t)=>'Que pergunta sobre '+t.toLocaleLowerCase('pt-PT')+' nunca encontrámos o momento certo para fazer?',
  (t)=>'Que exemplo concreto te ajudaria a explicar como vives '+t.toLocaleLowerCase('pt-PT')+'?',
  (t)=>'O que gostarias de preservar e o que já poderia mudar em relação a '+t.toLocaleLowerCase('pt-PT')+'?',
  (t)=>'Que parte de '+t.toLocaleLowerCase('pt-PT')+' preferes explorar devagar, sem pressão para responder já?',
  (t)=>'Qual seria um próximo passo pequeno e realista para conversarmos melhor sobre '+t.toLocaleLowerCase('pt-PT')+'?'
];
const duoTags=['abrir','reconhecer','clarificar','perguntar','concretizar','reavaliar','aprofundar','mover'];
const groupTemplates=[
  (t)=>'Se “'+t+'” fosse uma prova de festa, qual seria a regra mais absurda e inofensiva?',
  (t)=>'Que título de filme dariam a uma ronda sobre “'+t+'”? Vale uma versão completamente disparatada.',
  (t)=>'Inventem um anúncio de 15 segundos para uma versão imaginária de “'+t+'”.',
  (t)=>'Que música seria a banda sonora de “'+t+'” nesta festa? Cada pessoa pode propor uma.',
  (t)=>'Transformem “'+t+'” num superpoder inútil: qual seria o nome e qual seria a limitação?',
  (t)=>'Se “'+t+'” fosse um reality fictício, que prova segura e ridícula apareceria no episódio?',
  (t)=>'Criem um slogan para “'+t+'” como se fosse um produto absurdo que ninguém precisa de comprar.',
  (t)=>'Que conselho um extraterrestre daria ao grupo sobre “'+t+'” para sobreviver a esta noite?',
  (t)=>'Inventem uma manchete positiva e absurda sobre “'+t+'” daqui a dez anos.',
  (t)=>'Cada pessoa inventa uma solução disparatada para um dilema fictício ligado a “'+t+'”. Qual dá a melhor história?',
  (t)=>'Criem uma tradição de grupo ligada a “'+t+'” que seja fácil, barata e opcional.',
  (t)=>'Que mini-aventura gratuita de 30 minutos poderiam inventar a partir de “'+t+'”?'
];
const questions=[];
const seenText=new Set();
for(const group of themes){
  const sourceKinds=new Set(group.sources||[]);
  const groupEvidence=(group.evidence||[]).find(item=>item.source==='pdi-group')||null;
  const groupThemeKey=groupEvidence?.sourceId||'';
  const reusableQuestionThemeKeys=PDI_GROUP_QUESTION_REUSE[groupThemeKey]||[];
  const wantsGroup=sourceKinds.has('pdi-group');
  const wantsDuo=sourceKinds.has('pdi-conversation')||sourceKinds.has('oracle')||sourceKinds.has('maison-native')||sourceKinds.has('farol')||sourceKinds.has('volta-para-casa')||sourceKinds.has('ocean');
  const modes=[];
  if(wantsDuo)modes.push('duo');
  if(wantsGroup)modes.push('group');
  if(!modes.length)modes.push('duo');
  for(const mode of modes){
    const templates=mode==='group'?groupTemplates:duoTemplates;
    templates.forEach((makeText,index)=>{
      const text=makeText(group.preferredLabel);
      const textKey=norm(text);
      if(seenText.has(mode+'|'+textKey))return;
      seenText.add(mode+'|'+textKey);
      const id='pdi_qdraft_'+mode+'_'+slug(group.candidateKey)+'_'+String(index+1).padStart(2,'0');
      questions.push(preserve(id,{
        id,type:'pdi_question_draft',mode,
        theme:group.preferredLabel,themeKey:group.candidateKey,
        title:group.preferredLabel+' · '+(mode==='group'?'Grupo':'A dois')+' · '+String(index+1).padStart(2,'0'),
        stage:mode==='group'?'open':STAGES[index%STAGES.length],
        editorialFunction:mode==='group'?'humor_improviso_convivio':duoTags[index],
        text,
        sourceKinds:[...(group.sources||[])].sort(),
        sourceSignalRefs:(group.evidence||[]).map(x=>x.source+':'+x.sourceId).sort(),
        groupThemeKey:mode==='group'?groupThemeKey:null,
        reuseExistingQuestionThemeKeys:mode==='group'?reusableQuestionThemeKeys:[],
        reuseExistingLiveVaultQuestions:mode==='group'&&reusableQuestionThemeKeys.length>0,
        sourceQuestionBodiesCopiedToRepository:false,
        existingQuestionsRemainAvailableToDuo:true,
        sourceBasis:'internal_theme_catalogue',
        independentlyVerifiedDemand:false,
        status:'needs_editorial',
        active:false,bodyStored:true,approvalRequired:true,automaticActivation:false,publiclyAvailable:false
      }));
    });
  }
}
questions.sort((a,b)=>a.id.localeCompare(b.id));

const oldOracle=new Map((previous.oracleRoleBriefs||[]).map(x=>[x.id,x]));
const oracleRoleBriefs=ORACLE_TERRITORIES.flatMap(territory=>ROLES.map(role=>{
  const id='oracle_brief_'+slug(territory.slug)+'_'+role;
  const roleInstruction={
    opening:'Abre pela situação observável, sem adivinhar intenções nem anunciar uma previsão.',
    recognition:'Nomeia um padrão possível e deixa claro que é uma hipótese, não um diagnóstico.',
    tension:'Expõe uma tensão entre necessidades ou escolhas sem culpar a pessoa.',
    counterpoint:'Apresenta uma interpretação alternativa plausível, sem a declarar como verdade.',
    reframe:'Reformula a pergunta para devolver perspetiva e agência à pessoa.',
    movement:'Sugere uma ação pequena, reversível e proporcional ao contexto.',
    close:'Termina com uma pergunta que devolve a decisão à pessoa, sem criar dependência do Oráculo.'
  }[role];
  const old=oldOracle.get(id)||{};
  return {...preserve(id,{
    id,type:'oracle_role_brief',territory:territory.slug,territoryLabel:territory.label,
    role,focus:territory.focus,signal:territory.signal||'',hidden:territory.hidden||'',anchor:territory.anchor||'',
    editorialBrief:roleInstruction,
    sourceBasis:'internal_oracle_territory_catalogue',
    independentlyVerifiedDemand:false,
    bodyStored:false,status:'needs_editorial',approvalRequired:true,
    automaticActivation:false,readyForComposer:false
  }),...(old.editorialDecision?{editorialDecision:old.editorialDecision}:{})};
})).sort((a,b)=>a.id.localeCompare(b.id));

const bookConceptSpecs=[
  {slug:'limites-sem-culpa',title:'Limites sem Culpa',need:'Encontrar palavras para proteger tempo, energia e escolhas sem transformar cada limite numa guerra.',terms:/limites|respeito|autoabandono|culpa|autoridade|conflito|expectativas/},
  {slug:'quando-a-vida-fica-em-suspenso',title:'Quando a Vida Fica em Suspenso',need:'Lidar com incerteza, espera e decisões sem transformar o desconhecido numa certeza negativa.',terms:/incerteza|esperan[cç]a|recome[cç]o|mudan[cç]a|futuro|compromisso|desemprego/},
  {slug:'a-carga-invisivel',title:'A Carga Invisível',need:'Tornar visível o trabalho mental de cuidar, organizar e lembrar, sem apagar quem cuida.',terms:/cuidar|sobrecarga|organiza[cç][aã]o|fam[ií]lia|conviv[eê]ncia|equipa|colabora[cç][aã]o/},
  {slug:'dinheiro-vergonha-e-escolha',title:'Dinheiro, Vergonha e Escolha',need:'Refletir sobre pressão financeira, consumo e limites sem moralizar dificuldades económicas.',terms:/dinheiro|consumo|gastos|escassez|d[ií]vidas|heran[cç]a|impulso/},
  {slug:'atencao-num-mundo-fragmentado',title:'Atenção num Mundo Fragmentado',need:'Reconhecer dispersão e sobrecarga e desenhar pequenas mudanças que caibam no quotidiano.',terms:/foco|dispers[aã]o|sobrecarga|organiza[cç][aã]o|aprendizagem|criatividade/},
  {slug:'a-casa-que-nos-devolve',title:'A Casa que nos Devolve',need:'Pensar casa, pertença, mudança e espaço como parte da experiência quotidiana.',terms:/casa|mudan[cç]a de casa|desarruma[cç][aã]o|desapego|conviv[eê]ncia|ref[uú]gio/},
  {slug:'desejo-e-reciprocidade',title:'Desejo e Reciprocidade',need:'Explorar proximidade, desejo e comunicação sem presumir que existe uma única forma certa de se relacionar.',terms:/desejo|intimidade|proximidade|reciprocidade|amor|ci[uú]me|comunica[cç][aã]o|v[ií]nculo/},
  {slug:'depois-da-perda',title:'Depois da Perda',need:'Encontrar linguagem para luto, arrependimento e recomeço sem exigir que a dor tenha de servir para alguma coisa.',terms:/luto|perda|arrependimento|culpa|finitude|esperan[cç]a|recome[cç]o/},
  {slug:'amizade-adulta-e-pertença',title:'Amizade Adulta e Pertença',need:'Cuidar de amizade, reciprocidade e pertença quando a vida, o tempo e as prioridades mudam.',terms:/amizade|reciprocidade|fam[ií]lia|rela[cç][aã]o|pert[eê]n[cç]a|equipa/},
  {slug:'identidade-sem-personagem',title:'Identidade sem Personagem',need:'Reconhecer identidade, autenticidade e valor pessoal para além das personagens que usamos para agradar.',terms:/identidade|autenticidade|autoestima|valor|personagem|aprova[cç][aã]o|compara[cç][aã]o/},
  {slug:'pequenos-rituais-de-presenca',title:'Pequenos Rituais de Presença',need:'Usar gestos quotidianos e sensoriais como pausas intencionais, sem os confundir com tratamento ou solução mágica.',terms:/casa|ritual|corpo|presen[cç]a|cansa[cç]o|cuidado|mudan[cç]a/},
  {slug:'criatividade-sem-perfeccionismo',title:'Criatividade sem Perfeccionismo',need:'Recomeçar a criar com pequenas experiências, sem exigir que toda a tentativa tenha de produzir um resultado.',terms:/criatividade|bloqueio|cr[ií]tica|fracasso|aprendizagem|medo|mudan[cç]a/}
];
const priorBooks=new Map((previous.bookConceptIdeas||[]).map(x=>[x.id,x]));
const bookConceptIdeas=bookConceptSpecs.map(spec=>{
  const matched=ORACLE_TERRITORIES.filter(t=>spec.terms.test([t.slug,t.label,t.focus,t.group].join(' ')));
  const sourceRefs=matched.slice(0,16).map(t=>t.slug);
  const id='ebook_seed_'+spec.slug;
  return preserve(id,{
    id,type:'ebook_concept_seed',slug:spec.slug,workingTitle:spec.title,
    readerNeed:spec.need,
    readerPromise:'Oferecer linguagem, perguntas originais e exercícios proporcionais; não prometer cura, diagnóstico ou resultados garantidos.',
    sourceTerritories:sourceRefs,sourceCount:sourceRefs.length,
    sourceBasis:'internal_oracle_taxonomy',
    marketDemandValidated:false,readerResearchRequired:true,
    relatedProducts:['PÁRA DE IGNORAR!','Oráculo MAISON JF'],
    proposedOutline:[
      {chapter:1,title:'Dar nome ao que acontece'},
      {chapter:2,title:'Reconhecer padrões sem rotular pessoas'},
      {chapter:3,title:'Perguntas que abrem opções'},
      {chapter:4,title:'Experiências pequenas e reversíveis'},
      {chapter:5,title:'Integrar sem pressão e escolher o próximo passo'}
    ],
    bodyStored:false,status:'needs_editorial',approvalRequired:true,
    automaticPublication:false,automaticActivation:false
  });
}).sort((a,b)=>a.id.localeCompare(b.id));

const out={
  schema_version:'pdi_expansion_queue_v1',
  visibility:'internal-editorial',
  sources:['functions/_lib/pdi-theme-sources.js','functions/_lib/oracle-territories.js'],
  contracts:{
    sourceThemesAreNotProofOfMarketDemand:true,
    questionsRequireEditorialApproval:true,
    oracleBriefsAreNotComposerReady:true,
    ebookConceptsRequireMarketValidation:true,
    automaticActivation:false,
    publicPublication:false
  },
  summary:{
    exactThemeGroups:themes.length,
    duoQuestionDrafts:questions.filter(x=>x.mode==='duo').length,
    groupQuestionDrafts:questions.filter(x=>x.mode==='group').length,
    groupThemesWithExistingQuestionReuse:Object.keys(PDI_GROUP_QUESTION_REUSE).length,
    groupQuestionReuseSourceLinks:Object.values(PDI_GROUP_QUESTION_REUSE).reduce((total,keys)=>total+keys.length,0),
    groupQuestionDraftsLinkedToExistingThemes:questions.filter(x=>x.mode==='group'&&x.reuseExistingLiveVaultQuestions).length,
    questionDrafts:questions.length,
    oracleTerritories:ORACLE_TERRITORIES.length,
    oracleRoleBriefs:oracleRoleBriefs.length,
    ebookConceptSeeds:bookConceptIdeas.length,
    questionsRequiringEditorialApproval:questions.filter(x=>x.approvalRequired).length,
    oracleBriefsRequiringEditorialApproval:oracleRoleBriefs.filter(x=>x.approvalRequired).length,
    ebookConceptsRequiringHumanReview:bookConceptIdeas.filter(x=>x.approvalRequired).length
  },
  questions,oracleRoleBriefs,bookConceptIdeas
};
const rendered=stable(out);
if(CHECK){
  const current=JSON.parse(fs.readFileSync(OUTPUT,'utf8'));
  if(stable(current)!==rendered)throw new Error('pdi_expansion_queue_out_of_sync');
  console.log('PDI expansion queue: OK');
}else{
  fs.writeFileSync(OUTPUT,rendered);
  console.log(JSON.stringify(out.summary));
}
