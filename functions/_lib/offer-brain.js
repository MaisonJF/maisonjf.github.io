export const MAISON_OFFER_BRAIN={
  version:'2026-09-20-v5',
  freeOnly:'/teste/',
  maxOffers:4,
  principles:{
    primary:'Começar pela resposta MAISON mais pequena, relevante e fácil de experimentar.',
    ladder:'Depois da entrada, oferecer caminhos diferentes e relevantes. Continuidade fica reservada para depois de consulta ou contacto qualificado.',
    territories:'Casa, Corpo, Cabeça e Presença descrevem a necessidade humana; produto e serviço descrevem o formato comercial.',
    catalogue:'Novas ofertas entram no mesmo motor através de metadados. O teste não precisa de regras novas por produto.',
    learning:'Recomendação, clique e compra podem ser medidos por offer_id, resultado e versão do Brain sem guardar respostas do teste.',
    noDarkPatterns:'Não inventar urgência, escassez, diagnóstico, medo ou promessa de resultado para provocar compra.'
  },
  dimensions:['result','rankedAxes','route','territories','format','stage','priceBarrier'],
  stages:['now','deeper','continuity']
};

const AXES=new Set(['seen','attachment','self','control','belong','load','direction','security']);
const ROUTES=new Set(['talk','continuity','gesture','selfpaced','default']);
const TEST_PROFILES={
  apego:{
    secure:{result:'belong',route:'talk',ranked:[{key:'attachment',score:7},{key:'self',score:5},{key:'seen',score:3}]},
    anxious:{result:'attachment',route:'talk',ranked:[{key:'belong',score:8},{key:'seen',score:6},{key:'control',score:4}]},
    avoidant:{result:'self',route:'selfpaced',ranked:[{key:'control',score:7},{key:'attachment',score:4},{key:'direction',score:3}]},
    fearful:{result:'attachment',route:'continuity',ranked:[{key:'control',score:8},{key:'belong',score:7},{key:'security',score:5}]}
  },
  afeto:{
    palavras:{result:'seen',route:'talk',ranked:[{key:'belong',score:7},{key:'attachment',score:5}]},
    tempo:{result:'belong',route:'talk',ranked:[{key:'attachment',score:7},{key:'seen',score:4}]},
    gestos:{result:'self',route:'gesture',ranked:[{key:'seen',score:6},{key:'belong',score:4}]},
    toque:{result:'belong',route:'gesture',ranked:[{key:'attachment',score:7},{key:'load',score:4}]},
    simbolos:{result:'seen',route:'gesture',ranked:[{key:'belong',score:6},{key:'attachment',score:4}]}
  }
};
const AXIS_TERRITORIES={
  seen:['cabeca','presenca'],
  attachment:['presenca','cabeca'],
  self:['cabeca','corpo'],
  control:['cabeca'],
  belong:['presenca'],
  load:['corpo','casa'],
  direction:['cabeca'],
  security:['cabeca','casa']
};
const ROUTE_FORMATS={
  talk:['conversation','service','game'],
  continuity:['continuity','service'],
  gesture:['physical','game','oracle'],
  selfpaced:['oracle','ebook','written','game'],
  default:['oracle','game','physical','ebook','service']
};

export const MAISON_OFFER_CATALOGUE=[
  {id:'oracle-seen',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Aprovação & Validação',description:'Uma abertura simbólica para olhar para a necessidade de reconhecimento sem ficares preso à opinião dos outros.',href:'/oraculo/necessidade-aprovacao',amount:200,priceLabel:'2 €',axes:['seen'],territories:['cabeca','presenca'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-attachment',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Apego & Dependência',description:'Quando uma ligação, distância ou silêncio está a ocupar espaço a mais dentro de ti.',href:'/oraculo/dependencia-emocional',amount:200,priceLabel:'2 €',axes:['attachment'],territories:['presenca','cabeca'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-self',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Autoabandono',description:'Uma abertura para olhares para aquilo que tens deixado para depois enquanto cuidas de tudo o resto.',href:'/oraculo/autoabandono',amount:200,priceLabel:'2 €',axes:['self'],territories:['cabeca','corpo'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-self-worth',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Autoestima & Valor',description:'Para quando o teu valor parece depender demasiado da última resposta, elogio ou rejeição.',href:'/oraculo/autoestima-valor',amount:200,priceLabel:'2 €',axes:['self','seen'],territories:['cabeca','presenca'],routes:['selfpaced','gesture'],base:7},
  {id:'oracle-control',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Controlo & Incerteza',description:'Quando pensar mais já não está a trazer mais clareza.',href:'/oraculo/controlo-incerteza',amount:200,priceLabel:'2 €',axes:['control'],territories:['cabeca'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-belong',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Solidão & Companhia',description:'Para quando há pessoas por perto, mas ainda falta sentir presença ou lugar.',href:'/oraculo/solidao-companhia',amount:200,priceLabel:'2 €',axes:['belong'],territories:['presenca'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-load',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Energia & Cansaço',description:'Uma abertura para o que o teu corpo e o teu ritmo já estão a tentar dizer.',href:'/oraculo/energia-cansaco',amount:200,priceLabel:'2 €',axes:['load'],territories:['corpo'],routes:['selfpaced'],base:4},
  {id:'oracle-direction',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Escolhas & Mudança',description:'Quando tens opções, mas ainda não consegues perceber qual delas te pertence.',href:'/oraculo/escolhas',amount:200,priceLabel:'2 €',axes:['direction'],territories:['cabeca'],routes:['selfpaced','gesture'],base:5},
  {id:'oracle-security',family:'oracle',stage:'now',format:'oracle',title:'Oráculo · Medo do Futuro',description:'Uma abertura para a parte de ti que continua a preparar-se para perder chão.',href:'/oraculo/medo-futuro',amount:200,priceLabel:'2 €',axes:['security'],territories:['cabeca','casa'],routes:['selfpaced'],base:4},

  {id:'pdi-relacoes',family:'pdi',stage:'now',format:'game',title:'PÁRA DE IGNORAR!',description:'28 perguntas para duas pessoas abrirem uma conversa que nem sempre sabe começar sozinha.',href:'/para-de-ignorar/',amount:500,priceLabel:'5 €',axes:['attachment','belong','seen'],territories:['presenca'],routes:['talk','gesture','selfpaced'],base:6},

  {id:'ebook-turista',family:'editions',stage:'deeper',format:'ebook',title:'Vírgulas do Destino · O Turista',description:'Desejo, destino, mistério e um encontro que continua a fazer perguntas depois da última página.',href:'/ebooks/virgulas-do-destino-o-turista/',amount:299,priceLabel:'2,99 €',axes:['attachment','belong','direction'],territories:['presenca','cabeca'],routes:['selfpaced'],base:1},
  {id:'ebook-meandros',family:'editions',stage:'deeper',format:'ebook',title:'Vírgulas do Destino · Meandros da Vida',description:'Tarot, perda, desejo e recomeço numa história para quando preferes entrar por uma narrativa.',href:'/ebooks/virgulas-do-destino-meandros-da-vida/',amount:499,priceLabel:'4,99 €',axes:['attachment','direction','self'],territories:['presenca','cabeca'],routes:['selfpaced'],base:2},

  {id:'escalda-pes',family:'physical-care',stage:'now',format:'physical',title:'Escalda-Pés',description:'Um gesto simples para parar, aquecer e devolver alguns minutos ao corpo.',href:'/produtos/escalda-pes/',amount:500,priceLabel:'5 €',axes:['load','self'],territories:['corpo'],routes:['gesture'],base:6},
  {id:'nevoa',family:'physical-home',stage:'now',format:'physical',title:'Névoa de Ambiente',description:'Uma forma rápida de mudar o ambiente e marcar a passagem entre lá fora e aqui dentro.',href:'/produtos/nevoa/',amount:700,priceLabel:'7 €',axes:['load','control'],territories:['casa'],routes:['gesture'],base:4},
  {id:'vela-pequena',family:'physical-home',stage:'now',format:'physical',title:'Vela Aromática',description:'Um ponto de luz para mudar o ritmo do espaço sem complicar o gesto.',href:'/produtos/vela-pequena/',amount:800,priceLabel:'8 €',axes:['load','control'],territories:['casa'],routes:['gesture'],base:4},
  {id:'oleo-massagem',family:'physical-care',stage:'now',format:'physical',title:'Óleo de Massagem',description:'Toque e pausa para quando o corpo precisa de receber antes de explicar.',href:'/produtos/oleo-massagem/',amount:1200,priceLabel:'12 €',axes:['load','self'],territories:['corpo'],routes:['gesture'],base:5},
  {id:'presentes-intencao',family:'gift',stage:'now',format:'gift',title:'Presentes com intenção',description:'Quando queres transformar cuidado num gesto escolhido para aquela pessoa, sem oferecer só para cumprir.',href:'/presentes/',amount:null,priceLabel:'',axes:['seen','attachment','belong','self'],territories:['presenca','casa','corpo'],routes:['gesture','talk','default'],base:5},

  {id:'tarot-expresso',family:'consultation',stage:'deeper',format:'service',title:'Tarot · Uma pergunta',description:'Uma pergunta concreta e uma leitura directa para deixares de andar às voltas no mesmo ponto.',href:'/servicos/#tarot-expresso',amount:1700,priceLabel:'17 €',axes:['control','direction','security','seen'],territories:['cabeca'],routes:['talk','selfpaced'],base:4},
  {id:'consulta-escrita-breve',family:'written',stage:'deeper',format:'written',title:'Consulta por escrito · Breve',description:'Uma resposta concreta para leres agora e voltares quando precisares.',href:'/servicos/#consulta-escrita-breve',amount:2500,priceLabel:'25 €',axes:['control','direction','attachment','seen','self','security'],territories:['cabeca','presenca'],routes:['selfpaced'],base:5},
  {id:'tarot',family:'consultation',stage:'deeper',format:'service',title:'Tarot · Uma consulta',description:'Mais contexto para quando a pergunta parece simples, mas há outras coisas por baixo.',href:'/servicos/#tarot',amount:3500,priceLabel:'35 €',axes:['control','direction','attachment','seen','security'],territories:['cabeca','presenca'],routes:['talk'],base:5},
  {id:'escuta',family:'conversation',stage:'deeper',format:'conversation',title:'Escuta Orientada',description:'Dizes tudo. Pomos ordem no que está misturado. Depois vemos o que faz sentido fazer a seguir.',href:'/servicos/#escuta',amount:6000,priceLabel:'60 €',axes:['attachment','belong','self','control','direction'],territories:['presenca','cabeca'],routes:['talk'],base:7},
  {id:'tarot-terapeutico',family:'consultation',stage:'deeper',format:'service',title:'Tarot · Aprofundar',description:'Mais tempo e contexto para uma situação que tem história e não cabe numa resposta curta.',href:'/servicos/#tarot-terapeutico',amount:7000,priceLabel:'70 €',axes:['direction','attachment','self','control'],territories:['cabeca','presenca'],routes:['talk'],base:3},
  {id:'presenca',family:'presence',stage:'deeper',format:'service',title:'Presença',description:'Quando queres alguém contigo, à distância, presencialmente ou enquanto uma situação ainda está a acontecer.',href:'/portas/companhia#formatos',amount:3500,priceLabel:'desde 35 €',axes:['belong','attachment'],territories:['presenca'],routes:['talk','gesture'],base:5},

  {id:'acompanhamento',family:'continuity',stage:'continuity',format:'continuity',title:'Acompanhamento',description:'Quatro semanas para uma situação que precisa de continuidade sem recomeçar do zero.',href:'/servicos/#acompanhamento',amount:17000,priceLabel:'170 € · 4 semanas',axes:['seen','attachment','self','control','belong','load','direction','security'],territories:['cabeca','presenca','corpo'],routes:['continuity'],base:6},
  {id:'mentoria',family:'mentoring',stage:'continuity',format:'continuity',title:'Mentoria',description:'Estrutura e acompanhamento ajustados ao objetivo e ao percurso definido antes de começar.',href:'/servicos/#mentoria',amount:12500,priceLabel:'a partir de 125 €',axes:['direction','control','self'],territories:['cabeca'],routes:['continuity','talk'],base:4},
  {id:'sos',family:'presence',stage:'continuity',format:'service',title:'SOS Maison',description:'Uma janela de presença assíncrona para uma situação que ainda está a acontecer.',href:'/portas/companhia#sos',amount:6000,priceLabel:'desde 60 €',axes:['attachment','belong','load','security'],territories:['presenca','corpo','cabeca'],routes:['continuity','talk'],base:5}
];

export function recommendMaisonOffers(signal={}){
  const profile=normalizeProfile(signal);
  const territories=AXIS_TERRITORIES[profile.result]||[];
  const scored=MAISON_OFFER_CATALOGUE
    .filter(o=>o.status!=='hidden' && o.stage!=='continuity')
    .map(offer=>scoreOffer(offer,profile,territories))
    .sort((a,b)=>b.score-a.score || compareAmount(a.offer.amount,b.offer.amount));

  const groups=['oracle','game','physical','gift','consultation'];
  const bestByGroup=new Map();
  for(const group of groups){
    const candidate=scored.find(entry=>offerGroup(entry.offer)===group);
    if(candidate)bestByGroup.set(group,candidate);
  }

  const selected=[];
  const addGroup=group=>{
    const candidate=bestByGroup.get(group);
    if(candidate && !selected.some(x=>x.offer.id===candidate.offer.id))selected.push(candidate);
  };

  addGroup('oracle');
  addGroup('consultation');

  const flexible=['game','physical','gift']
    .map(group=>({group,candidate:bestByGroup.get(group)}))
    .filter(x=>x.candidate)
    .sort((a,b)=>b.candidate.score-a.candidate.score || compareAmount(a.candidate.offer.amount,b.candidate.offer.amount));

  for(const item of flexible){
    if(selected.length>=MAISON_OFFER_BRAIN.maxOffers)break;
    addGroup(item.group);
  }

  if(selected.length<MAISON_OFFER_BRAIN.maxOffers){
    for(const candidate of scored){
      if(selected.length>=MAISON_OFFER_BRAIN.maxOffers)break;
      if(selected.some(s=>s.offer.id===candidate.offer.id))continue;
      if(selected.some(s=>offerGroup(s.offer)===offerGroup(candidate.offer)))continue;
      selected.push(candidate);
    }
  }

  const order={oracle:0,game:1,physical:2,gift:3,consultation:4};
  selected.sort((a,b)=>(order[offerGroup(a.offer)]??9)-(order[offerGroup(b.offer)]??9));

  return {
    version:MAISON_OFFER_BRAIN.version,
    result:profile.result,
    route:profile.route,
    offers:selected.slice(0,MAISON_OFFER_BRAIN.maxOffers).map((entry,index)=>publicOffer(entry,index))
  };
}

function offerGroup(offer){
  if(offer.family==='oracle'||offer.format==='oracle')return 'oracle';
  if(offer.family==='pdi'||offer.format==='game')return 'game';
  if(offer.family==='gift'||offer.format==='gift')return 'gift';
  if(offer.format==='physical'||String(offer.family||'').startsWith('physical-'))return 'physical';
  if(['consultation','written','conversation','presence'].includes(offer.family)||['service','written','conversation'].includes(offer.format))return 'consultation';
  return String(offer.family||offer.format||'other');
}

function normalizeProfile(signal){
  const test=String(signal.test||'').toLowerCase();
  const testResult=String(signal.testResult||'').toLowerCase();
  const mapped=TEST_PROFILES[test]?.[testResult]||null;
  const result=AXES.has(String(signal.result||''))?String(signal.result):(mapped?.result||'control');
  const route=ROUTES.has(String(signal.route||''))?String(signal.route):(mapped?.route||'default');
  const ranked=Array.isArray(signal.ranked)&&signal.ranked.length?signal.ranked.slice(0,8):(mapped?.ranked||[]);
  const rankedAxes=ranked
    .map((item,index)=>({
      key:AXES.has(String(item?.key||''))?String(item.key):'',
      score:Number.isFinite(Number(item?.score))?Number(item.score):Math.max(0,8-index)
    }))
    .filter(x=>x.key);
  return {result,route,rankedAxes,test,testResult};
}

function scoreOffer(offer,profile,territories){
  let score=Number(offer.base||0);
  const reasons=[];
  if(offer.axes.includes(profile.result)){score+=20;reasons.push('primary_axis');}
  profile.rankedAxes.slice(0,4).forEach((axis,index)=>{
    if(offer.axes.includes(axis.key)){score+=[8,5,3,2][index];reasons.push('ranked_axis_'+(index+1));}
  });
  if(offer.territories.some(t=>territories.includes(t))){score+=5;reasons.push('territory');}
  if(offer.routes.includes(profile.route)){score+=8;reasons.push('route');}
  if((ROUTE_FORMATS[profile.route]||ROUTE_FORMATS.default).includes(offer.format)){score+=4;reasons.push('format');}

  if(offer.stage==='now' && Number.isFinite(offer.amount) && offer.amount<=1500){score+=3;reasons.push('low_barrier');}
  if(offer.stage==='deeper' && Number.isFinite(offer.amount) && offer.amount>=1600 && offer.amount<=8000){score+=2;reasons.push('deeper_fit');}
  if(offer.stage==='continuity' && profile.route==='continuity'){score+=7;reasons.push('continuity_intent');}

  if(profile.route==='selfpaced' && ['oracle','ebook','written','game'].includes(offer.format)){score+=3;}
  if(profile.route==='talk' && ['conversation','service','game'].includes(offer.format)){score+=3;}
  if(profile.route==='gesture' && ['physical','game','oracle'].includes(offer.format)){score+=3;}

  return {offer,score,reasons:[...new Set(reasons)]};
}

function diversityOk(offer,selected){
  if(!selected.length)return true;
  const sameFamily=selected.filter(s=>s.offer.family===offer.family).length;
  if(sameFamily>0 && offer.family!=='continuity')return false;
  return true;
}

function publicOffer(entry,index){
  const o=entry.offer;
  const group=offerGroup(o);
  const labels={
    oracle:'Outra perspectiva',
    game:'Para abrir conversa',
    physical:'Um gesto concreto',
    gift:'Para oferecer',
    consultation:'Quero ir mais fundo'
  };
  return {
    id:o.id,
    slot:group,
    slotLabel:labels[group]||(['Agora','Explorar','Aprofundar','Continuar'][index]||'Continuar'),
    title:o.title,
    description:o.description,
    href:o.href,
    priceLabel:o.priceLabel||'',
    format:o.format,
    score:entry.score,
    reasonCodes:entry.reasons
  };
}

function compareAmount(a,b){
  const av=Number.isFinite(a)?a:Number.MAX_SAFE_INTEGER;
  const bv=Number.isFinite(b)?b:Number.MAX_SAFE_INTEGER;
  return av-bv;
}

/* Backwards-compatible route helper used by older Brain/Ocean code. */
export function routeMaisonOffer(signal={}){
  const domain=String(signal.domain||'');
  if(domain==='casa')return {destination:'/produtos/',ladder:'home'};
  if(domain==='corpo')return {destination:'/produtos/',ladder:'body'};
  if(domain==='companhia'||domain==='presenca')return {destination:'/portas/companhia',ladder:'presence'};
  if(String(signal.format||'')==='falar')return {destination:'/servicos/#escuta',ladder:'clarity'};
  return {destination:'/oraculo/',ladder:'clarity'};
}
