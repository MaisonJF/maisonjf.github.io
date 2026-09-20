import {ORACLE_TERRITORIES} from './oracle-territories.js';
import {buildPdiThemeSourceSignals} from './pdi-theme-sources.js';
import {VPC_OCEAN_SIGNALS,VPC_OCEAN_SIGNAL_VERSION} from './vpc-ocean-signals.generated.js';

export const VPC_QUESTION_ENGINE_VERSION='2026-09-21-ocean-v1';

const AXES=['seen','attachment','self','control','belong','load','direction','security'];
const SECONDARY={
  seen:'belong',attachment:'control',self:'load',control:'security',
  belong:'attachment',load:'self',direction:'control',security:'control'
};
const ATTENTION_TOPIC_STEMS=[
  label=>`Quando ${lower(label)} começa a ocupar espaço, o que parece estar realmente em jogo?`,
  label=>`Se o tema fosse ${lower(label)}, onde sentirias primeiro a pressão?`,
  label=>`O que costuma pesar mais em ti quando aparece ${lower(label)}?`,
  label=>`Quando pensas em ${lower(label)}, qual destas tensões reconheces mais depressa?`,
  label=>`Se ${lower(label)} te apanhasse num dia mais vulnerável, o que cresceria primeiro?`,
  label=>`Por baixo de ${lower(label)}, qual destas necessidades poderia estar a pedir atenção?`
];

const AXIS_OPTIONS={
  seen:[
    'Sentir que o meu esforço passou despercebido.',
    'Precisar de perceber se aquilo que fiz teve valor.',
    'Ficar preso ao modo como fui visto ou avaliado.',
    'Querer um sinal de reconhecimento antes de conseguir pousar o assunto.',
    'Sentir que tenho de provar outra vez que mereço lugar.',
    'Levar uma crítica comigo muito depois de a conversa acabar.'
  ],
  attachment:[
    'Não saber ao certo onde estou numa ligação importante.',
    'Notar distância e querer perceber imediatamente o que mudou.',
    'Precisar de um sinal de que a ligação continua segura.',
    'Ficar preso ao silêncio, à ausência ou à falta de resposta.',
    'Sentir medo de perder uma pessoa antes de existir uma perda real.',
    'Dar demasiado peso a pequenas mudanças na proximidade.'
  ],
  self:[
    'Perceber que me estou a deixar para depois.',
    'Sentir culpa por escolher uma necessidade minha.',
    'Continuar a cuidar quando já precisava de parar.',
    'Ter dificuldade em dizer não sem me sentir egoísta.',
    'Engolir o que preciso para evitar desapontar alguém.',
    'Confundir ser útil com ter de aguentar sempre mais.'
  ],
  control:[
    'Precisar de fechar a incerteza antes de conseguir descansar.',
    'Pensar mais e mais à procura de uma garantia que não existe.',
    'Tentar antecipar todos os cenários para não ser apanhado de surpresa.',
    'Ficar preso à peça de informação que ainda me falta.',
    'Sentir que só consigo avançar quando tudo fizer sentido.',
    'Voltar ao mesmo assunto porque ainda não encontrei uma resposta definitiva.'
  ],
  belong:[
    'Sentir falta de um lugar onde possa baixar a guarda.',
    'Estar com pessoas e continuar a sentir pouca ligação real.',
    'Perguntar-me se pertenço mesmo ali.',
    'Sentir que tenho contacto, mas não a companhia de que preciso.',
    'Precisar de reciprocidade em vez de apenas presença à volta.',
    'Querer ser incluído sem ter de me tornar indispensável.'
  ],
  load:[
    'Ter mais coisas em cima do que energia disponível.',
    'Sentir que o corpo já está a pedir pausa antes de eu aceitar parar.',
    'Continuar a funcionar mesmo quando já não tenho margem.',
    'Chegar ao fim do dia sem ter recuperado em momento nenhum.',
    'Sentir que até coisas pequenas começam a pesar demasiado.',
    'Precisar de descanso e tratá-lo como mais uma obrigação.'
  ],
  direction:[
    'Não saber qual é o próximo passo que me pertence.',
    'Ter opções e continuar sem conseguir escolher uma.',
    'Perguntar-me se estou a construir a vida certa para mim.',
    'Adiar uma decisão porque todas as alternativas parecem ter um custo.',
    'Sentir que avanço, mas não sei se é na minha direcção.',
    'Querer escolher sem ter de garantir já o futuro inteiro.'
  ],
  security:[
    'Sentir que a margem pode desaparecer depressa.',
    'Pensar no futuro como se estivesse sempre a um passo de faltar alguma coisa.',
    'Precisar de uma base prática antes de conseguir relaxar.',
    'Ficar em alerta quando dinheiro, casa ou estabilidade parecem incertos.',
    'Escolher o mais seguro mesmo quando já não me serve muito bem.',
    'Sentir que uma mudança pequena pode tirar-me demasiado chão.'
  ]
};

const APEGO_STEMS=[
  label=>`Quando ${lower(label)} mexe numa relação importante, qual destes impulsos reconheces primeiro?`,
  label=>`Se o tema entre vocês fosse ${lower(label)}, o que aconteceria mais depressa dentro de ti?`,
  label=>`Quando aparece ${lower(label)}, como costumas proteger a ligação — ou proteger-te dela?`,
  label=>`Numa relação que te importa, o que acontece contigo quando entra ${lower(label)}?`
];
const APEGO_CHOICES=[
  [
    ['secure','Tento perceber o que está a acontecer antes de transformar aquilo numa ameaça à ligação.'],
    ['anxious','Fico mais atento a sinais de distância e preciso de sentir que continuo a ser escolhido.'],
    ['avoidant','A minha primeira vontade é recuperar espaço e depender menos do que está a acontecer.'],
    ['fearful','Quero aproximar-me e, ao mesmo tempo, proteger-me antes que doa.']
  ],
  [
    ['secure','Consigo ficar na conversa sem deixar de ser eu.'],
    ['anxious','Procuro depressa uma resposta que me devolva segurança.'],
    ['avoidant','Tendo a fechar-me ou a baixar a intensidade para voltar a sentir controlo.'],
    ['fearful','Uma parte quer ficar muito perto; outra já está a procurar uma saída.']
  ],
  [
    ['secure','Observo comportamento, pergunto e dou tempo ao que ainda não sei.'],
    ['anxious','A minha cabeça começa a procurar provas de que alguma coisa mudou.'],
    ['avoidant','Tento convencer-me de que aquilo não me afecta assim tanto.'],
    ['fearful','Sinto a ligação muito forte e também medo do que ela me pode fazer.']
  ],
  [
    ['secure','Procuro uma forma de reparar ou ajustar sem pôr a relação inteira em causa.'],
    ['anxious','Tenho dificuldade em descansar enquanto não sinto que está tudo bem entre nós.'],
    ['avoidant','Preciso de distância antes de conseguir lidar com o assunto.'],
    ['fearful','Posso querer que venha atrás de mim e querer desaparecer quase ao mesmo tempo.']
  ]
];

const AFETO_STEMS=[
  label=>`Quando o tema é ${lower(label)}, o que te faria sentir mais cuidado?`,
  label=>`Numa fase marcada por ${lower(label)}, que gesto te chegaria mais fundo?`,
  label=>`Se ${lower(label)} estivesse a pesar entre duas pessoas, o que faria mais diferença para ti?`,
  label=>`Quando pensas em ${lower(label)}, qual destas formas de presença te faria sentir mais visto?`
];
const AFETO_CHOICES=[
  [
    ['palavras','Ouvir palavras específicas que mostrem que a pessoa percebeu mesmo o que estou a viver.'],
    ['tempo','Ter tempo inteiro, sem pressa nem metade da atenção noutro sítio.'],
    ['gestos','Ver um cuidado concreto acontecer sem eu ter de o explicar três vezes.'],
    ['toque','Receber proximidade física segura e espontânea.'],
    ['simbolos','Ter um detalhe escolhido porque aquela pessoa se lembrou de mim.']
  ],
  [
    ['palavras','Uma mensagem ou frase que eu queira guardar.'],
    ['tempo','A pessoa parar e ficar realmente comigo.'],
    ['gestos','Alguém aliviar-me uma coisa prática.'],
    ['toque','Um abraço, mão ou proximidade que me faça baixar a guarda.'],
    ['simbolos','Um pequeno objecto, memória ou sinal com significado só nosso.']
  ],
  [
    ['palavras','Dizer claramente o que sente e o lugar que eu tenho.'],
    ['tempo','Escolher estar comigo quando podia simplesmente seguir o dia.'],
    ['gestos','Mostrar no comportamento que ouviu o que eu precisava.'],
    ['toque','Procurar contacto sem o transformar numa obrigação.'],
    ['simbolos','Marcar aquele momento com alguma coisa que fique.']
  ],
  [
    ['palavras','Reconhecer em voz alta aquilo que normalmente fica implícito.'],
    ['tempo','Dar-me presença sem tentar despachar a emoção.'],
    ['gestos','Fazer uma coisa pequena que melhore mesmo o meu dia.'],
    ['toque','Estar fisicamente perto no ritmo que me faz bem.'],
    ['simbolos','Escolher um detalhe impossível de confundir com um presente genérico.']
  ]
];

export function composeVpcQuestionSet({test,seed,vaultQuestions=[]}={}){
  const normalized=normalizeTest(test);
  if(!normalized)throw new Error('unsupported_vpc_test');
  const rng=mulberry32(hashSeed(String(seed||'vpc')+'|'+normalized+'|'+VPC_QUESTION_ENGINE_VERSION));
  const vault=sanitizeVaultQuestions(vaultQuestions,normalized);

  if(normalized==='attention'){
    const ocean=buildAttentionPool(rng);
    const questions=blend(vault,ocean,12,rng,cardSignature);
    return payload(normalized,questions,seed,vault.length);
  }
  if(normalized==='apego'){
    const ocean=buildApegoPool(rng);
    const questions=blend(vault,ocean,10,rng,cardSignature);
    return payload(normalized,questions,seed,vault.length);
  }
  const ocean=buildAfetoPool(rng);
  const questions=blend(vault,ocean,10,rng,cardSignature);
  return payload(normalized,questions,seed,vault.length);
}

export function normalizeVaultVpcRow(row){
  const productFit=parseJson(row?.product_fit_json,{});
  const vpc=productFit?.vpc||{};
  const test=normalizeTest(vpc.test||row?.theme);
  if(!test||!Array.isArray(vpc.choices))return null;
  const q=cleanText(row.text,180);
  if(!q)return null;
  const source={kind:'vault',id:String(row.question_id||'')||undefined,oceanId:row.source_ocean_id||undefined};

  if(test==='attention'){
    const a=vpc.choices.map(x=>({
      t:cleanText(x?.text,180),
      p:AXES.includes(String(x?.primary||x?.key||''))?String(x.primary||x.key):'',
      s:AXES.includes(String(x?.secondary||''))?String(x.secondary):''
    })).filter(x=>x.t&&x.p).map(x=>({...x,s:x.s||SECONDARY[x.p]}));
    if(a.length!==4||new Set(a.map(x=>x.p)).size<3)return null;
    return {test,q,a,source};
  }

  const allowed=test==='apego'?new Set(['secure','anxious','avoidant','fearful']):new Set(['palavras','tempo','gestos','toque','simbolos']);
  const a=vpc.choices.map(x=>[String(x?.key||''),cleanText(x?.text,180)]).filter(([key,text])=>allowed.has(key)&&text);
  const expected=test==='apego'?4:5;
  if(a.length!==expected||new Set(a.map(x=>x[0])).size!==expected)return null;
  return {test,q,a,source};
}

function payload(test,questions,seed,vaultCount){
  return {
    version:VPC_QUESTION_ENGINE_VERSION,
    oceanVersion:VPC_OCEAN_SIGNAL_VERSION,
    test,
    seed:String(seed||''),
    questionCount:questions.length,
    approvedVaultCandidates:vaultCount,
    sources:[...new Set(questions.map(q=>q.source?.kind||'ocean-derived'))],
    questions:questions.map(stripInternal)
  };
}

function buildAttentionPool(rng){
  const topics=[
    ...ORACLE_TERRITORIES.map(t=>({id:t.slug,label:t.label,kind:'ocean-territory'})),
    ...VPC_OCEAN_SIGNALS.flatMap(o=>(o.themes||[]).map((theme,index)=>({id:o.id+'-'+index,label:humanize(theme),kind:'ocean-signal',oceanId:o.id})))
  ];
  const pool=[];
  for(const topic of shuffle(topics,rng)){
    for(let v=0;v<ATTENTION_TOPIC_STEMS.length;v++){
      const axes=sampleDistinct(AXES,4,rng);
      const a=axes.map(axis=>({
        t:pick(AXIS_OPTIONS[axis],rng)||fallbackAxisText(axis),
        p:axis,
        s:SECONDARY[axis]
      }));
      pool.push({
        test:'attention',
        q:ATTENTION_TOPIC_STEMS[v](topic.label),
        a,
        source:{kind:topic.kind,id:'attention-'+topic.id+'-'+v,oceanId:topic.oceanId||topic.id}
      });
    }
  }
  return dedupe(pool,cardSignature);
}

function buildApegoPool(rng){
  const topics=relationshipTopics();
  const pool=[];
  let n=0;
  for(const topic of topics){
    for(let v=0;v<APEGO_STEMS.length;v++){
      const choices=APEGO_CHOICES[(n+v)%APEGO_CHOICES.length].map(x=>x.slice());
      pool.push({
        test:'apego',
        q:APEGO_STEMS[v](topic.label),
        a:shuffle(choices,rng),
        source:{kind:topic.kind,id:'apego-'+topic.id,oceanId:topic.oceanId}
      });
    }
    n++;
  }
  return dedupe(pool,cardSignature);
}

function buildAfetoPool(rng){
  const topics=relationshipTopics();
  const pool=[];
  let n=0;
  for(const topic of topics){
    for(let v=0;v<AFETO_STEMS.length;v++){
      const choices=AFETO_CHOICES[(n+v)%AFETO_CHOICES.length].map(x=>x.slice());
      pool.push({
        test:'afeto',
        q:AFETO_STEMS[v](topic.label),
        a:shuffle(choices,rng),
        source:{kind:topic.kind,id:'afeto-'+topic.id,oceanId:topic.oceanId}
      });
    }
    n++;
  }
  return dedupe(pool,cardSignature);
}

function relationshipTopics(){
  const out=[];
  for(const t of ORACLE_TERRITORIES){
    if(t.group==='Relações & Vínculos'||['Família & Laços','Família & Cuidado'].includes(t.group)){
      out.push({id:t.slug,label:t.label,kind:'ocean-territory'});
    }
  }
  for(const s of VPC_OCEAN_SIGNALS){
    if(/v[ií]nculo|rela[cç]|solid[aã]o|cuidar|silencia|perda|conex/i.test([s.id,s.intent,...(s.themes||[])].join(' '))){
      out.push({id:s.id,label:humanize(s.themes?.[0]||s.id),kind:'ocean-signal',oceanId:s.id});
    }
  }
  for(const s of buildPdiThemeSourceSignals()){
    if(s.source==='pdi-conversation')out.push({id:s.slug,label:s.label,kind:'maison-conversation-seed'});
  }
  return uniqueBy(out,x=>normalize(x.label));
}

function sanitizeVaultQuestions(items,test){
  return (Array.isArray(items)?items:[])
    .map(item=>item?.test?item:normalizeVaultVpcRow(item))
    .filter(item=>item&&item.test===test)
    .filter(validateCard);
}

function validateCard(card){
  if(!card||!cleanText(card.q,180))return false;
  if(card.test==='attention'){
    return Array.isArray(card.a)&&card.a.length===4&&card.a.every(x=>cleanText(x.t,180)&&AXES.includes(x.p)&&AXES.includes(x.s));
  }
  const expected=card.test==='apego'?4:5;
  return Array.isArray(card.a)&&card.a.length===expected&&card.a.every(x=>Array.isArray(x)&&x.length===2&&cleanText(x[1],180));
}

function blend(vault,ocean,count,rng,signature){
  const approved=shuffle(dedupe(vault,signature),rng);
  const generated=shuffle(dedupe(ocean,signature),rng);
  const maxVault=Math.min(approved.length,Math.max(2,Math.floor(count*.4)));
  const selected=approved.slice(0,maxVault);
  const seen=new Set(selected.map(signature));
  for(const card of generated){
    if(selected.length>=count)break;
    const sig=signature(card);if(seen.has(sig))continue;
    selected.push(card);seen.add(sig);
  }
  for(const card of approved.slice(maxVault)){
    if(selected.length>=count)break;
    const sig=signature(card);if(seen.has(sig))continue;
    selected.push(card);seen.add(sig);
  }
  if(selected.length<count)throw new Error('insufficient_vpc_questions');
  return shuffle(selected,rng);
}

function stripInternal(card){
  if(card.test==='attention')return {q:card.q,a:shuffleNative(card.a).map(x=>({t:x.t,p:x.p,s:x.s}))};
  return [card.q,shuffleNative(card.a).map(x=>x.slice())];
}


function fallbackAxisText(axis){
  return {
    seen:'Sentir que não fui realmente visto ou reconhecido',
    attachment:'Não saber onde estou numa ligação importante',
    self:'Perceber que me estou a deixar para depois',
    control:'Ficar sem uma resposta que feche a incerteza',
    belong:'Sentir falta de um lugar onde possa baixar a guarda',
    load:'Ter mais coisas em cima do que energia disponível',
    direction:'Não saber qual é o próximo passo que me pertence',
    security:'Sentir que a margem pode desaparecer depressa'
  }[axis];
}

function normalizeTest(value){
  const v=normalize(value);
  if(['attention','atencao','vpc-attention'].includes(v))return 'attention';
  if(['apego','attachment','vpc-apego'].includes(v))return 'apego';
  if(['afeto','afecto','affection','vpc-afeto','vpc-afecto'].includes(v))return 'afeto';
  return '';
}
function cardSignature(card){return normalize(card?.q||'');}
function cleanText(value,max=180){
  const text=String(value||'').replace(/\s+/g,' ').trim();
  return text&&text.length<=max?text:'';
}
function lower(value){return String(value||'').trim().toLocaleLowerCase('pt-PT')}
function capitalize(value){const s=String(value||'').trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function humanize(value){return capitalize(String(value||'').replace(/[-_]+/g,' ').trim())}
function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function parseJson(value,fallback){try{return JSON.parse(value)}catch{return fallback}}
function uniqueBy(items,keyFn){const out=[],seen=new Set();for(const item of items){const key=keyFn(item);if(!key||seen.has(key))continue;seen.add(key);out.push(item)}return out}
function dedupe(items,keyFn){return uniqueBy(items,keyFn)}
function sampleDistinct(items,count,rng){return shuffle(items,rng).slice(0,count)}
function pick(items,rng){return items?.length?items[Math.floor(rng()*items.length)]:null}
function shuffle(items,rng){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function shuffleNative(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function hashSeed(input){let h=2166136261>>>0;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
