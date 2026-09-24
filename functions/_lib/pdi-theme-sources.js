import { ORACLE_TERRITORIES } from './oracle-territories.js';
import { VPC_OCEAN_SIGNALS } from './vpc-ocean-signals.generated.js';

const FAROL_MOMENTS=[
  {slug:'decisao',label:'Decisão',question:'O que te faria sair daqui diferente?'},
  {slug:'relacao',label:'Relação',question:'O que queres mesmo desta noite?'},
  {slug:'cansaco',label:'Cansaço',question:'O que o teu corpo te está a pedir sem palavras?'},
  {slug:'casa',label:'Casa',question:'O que devia mudar primeiro quando entras?'},
  {slug:'trabalho',label:'Trabalho',question:'O que está realmente a pedir movimento?'},
  {slug:'dinheiro',label:'Dinheiro',question:'O que está a pesar mais: os números ou o que eles fazem contigo?'},
  {slug:'eu',label:'Eu',question:'Onde é que te perdes primeiro?'},
  {slug:'desligar',label:'Desligar',question:'Como queres desaparecer daqui sem fugir de ti?'},
  {slug:'aprender',label:'Aprender',question:'O que queres conseguir dizer daqui a uns meses?'},
  {slug:'companhia',label:'Companhia',question:'O que te faria dizer “ainda bem que fui”?'},
  {slug:'presente',label:'Presente',question:'O que queres que a pessoa sinta antes de saber quanto custou?'}
];

const VPC_AXES=[
  {slug:'valorizacao',label:'Valorização'},
  {slug:'vinculo',label:'Vínculo'},
  {slug:'autoabandono',label:'Autoabandono'},
  {slug:'controlo',label:'Controlo'},
  {slug:'pertenca',label:'Pertença'},
  {slug:'sobrecarga',label:'Sobrecarga'},
  {slug:'direccao',label:'Direcção'},
  {slug:'seguranca',label:'Segurança'}
];


const PDI_CONVERSATION_SEEDS=[
  {slug:'primeiras-impressoes',label:'Primeiras Impressões',focus:'aquilo que cada pessoa reparou primeiro e o que mudou desde então'},
  {slug:'pequenas-manias',label:'Pequenas Manias',focus:'hábitos, gestos e detalhes quotidianos que irritam, divertem ou dão ternura'},
  {slug:'o-que-admiro-em-ti',label:'O que admiro em ti',focus:'qualidades, capacidades e formas de estar que merecem ser ditas em voz alta'},
  {slug:'humor-e-brincadeira',label:'Humor & Brincadeira',focus:'o que faz duas pessoas rir, provocar-se e voltar a sentir leveza juntas'},
  {slug:'desejo-e-iniciativa',label:'Desejo & Iniciativa',focus:'como cada pessoa vive atração, iniciativa, vontade e reciprocidade sem pressupor respostas'},
  {slug:'toque-e-proximidade',label:'Toque & Proximidade',focus:'formas de carinho, proximidade física e conforto que fazem sentido para cada pessoa'},
  {slug:'segredos-e-silencios',label:'Segredos & Silêncios',focus:'coisas que ficaram por dizer, não por obrigação de revelar, mas por falta de momento ou coragem'},
  {slug:'depois-da-discussao',label:'Depois da Discussão',focus:'como cada pessoa repara, regressa ao vínculo e percebe quando um conflito realmente terminou'},
  {slug:'pedir-e-receber',label:'Pedir & Receber',focus:'a dificuldade de pedir atenção, ajuda, carinho ou espaço e a forma como o outro responde'},
  {slug:'liberdade-dentro-da-relacao',label:'Liberdade dentro da Relação',focus:'individualidade, autonomia e espaço pessoal sem transformar distância em ameaça'},
  {slug:'rotina-e-tedio',label:'Rotina & Tédio',focus:'o que a rotina protege, o que adormece e aquilo que ainda pode surpreender'},
  {slug:'rituais-de-dois',label:'Rituais de Dois',focus:'pequenos hábitos partilhados que dão identidade, segurança ou prazer à relação'},
  {slug:'dinheiro-a-dois',label:'Dinheiro a Dois',focus:'gastos, poupança, ajuda, independência e expectativas financeiras entre duas pessoas'},
  {slug:'trabalho-entra-em-casa',label:'Quando o Trabalho Entra em Casa',focus:'o impacto do cansaço, horários, ambição e pressão profissional na relação'},
  {slug:'familias-que-entram-na-relacao',label:'Famílias que entram na Relação',focus:'expectativas familiares, lealdades, tradições e fronteiras entre o casal e as famílias'},
  {slug:'amigos-e-vida-social',label:'Amigos & Vida Social',focus:'amizades, saídas, grupos, prioridades e a forma como cada pessoa ocupa o mundo fora da relação'},
  {slug:'o-passado-que-ainda-aparece',label:'O Passado que Ainda Aparece',focus:'ex-relacionamentos, memórias e comparações que ainda influenciam a relação presente'},
  {slug:'telemovel-e-privacidade',label:'Telemóvel & Privacidade',focus:'mensagens, redes sociais, passwords, disponibilidade e limites digitais'},
  {slug:'distancia-e-presenca',label:'Distância & Presença',focus:'o que muda quando há distância física, emocional ou temporal entre duas pessoas'},
  {slug:'casa-e-convivencia',label:'Casa & Convivência',focus:'tarefas, espaço, descanso, organização e as pequenas negociações de viver juntos'},
  {slug:'sexo-sem-roteiro',label:'Intimidade sem Roteiro',focus:'conversa adulta sobre desejo, conforto, curiosidade e limites sem exigir desempenho nem detalhe explícito'},
  {slug:'futuro-imaginado',label:'Futuro Imaginado',focus:'os futuros que cada pessoa imagina, teme ou evita nomear'},
  {slug:'sonhos-e-planos-absurdos',label:'Sonhos & Planos Improváveis',focus:'coisas grandes, estranhas ou improváveis que cada pessoa ainda gostaria de viver'},
  {slug:'medos-que-nao-mostro',label:'Medos que Não Mostro',focus:'inseguranças, receios e vulnerabilidades que nem sempre aparecem por fora'},
  {slug:'como-gosto-de-ser-cuidado',label:'Como Gosto de Ser Cuidado',focus:'gestos de apoio, presença e cuidado que realmente chegam a cada pessoa'},
  {slug:'quando-preciso-de-espaco',label:'Quando Preciso de Espaço',focus:'como pedir distância temporária sem abandono, castigo ou leitura automática de rejeição'},
  {slug:'coisas-que-quero-viver-contigo',label:'Coisas que Quero Viver Contigo',focus:'experiências, lugares, rotinas e memórias que ainda gostariam de construir juntos'},
  {slug:'perguntas-que-nunca-fiz',label:'Perguntas que Nunca Fiz',focus:'curiosidades honestas que ficaram adiadas porque nunca apareceu o momento certo'}
];

const MAISON_NATIVE_SEEDS=[
  {
    slug:'o-que-nunca-te-perguntei',
    label:'O que nunca te perguntei',
    focus:'aquilo que sempre quiseste saber sobre alguém sem encontrares a forma de perguntar'
  },
  {
    slug:'o-que-nunca-disse',
    label:'O que nunca te disse',
    focus:'aquilo que ficou por dizer por medo, vergonha, timing ou falta de palavras'
  },
  {
    slug:'se-eu-pudesse-perguntar',
    label:'Se eu pudesse perguntar',
    focus:'perguntas que normalmente ficam presas entre curiosidade, intimidade e receio da resposta'
  }
];

export function buildPdiThemeSourceSignals(){
  const signals=[];

  for(const territory of ORACLE_TERRITORIES){
    signals.push({
      source:'oracle',
      sourceId:territory.slug,
      slug:territory.slug,
      label:territory.label,
      family:territory.group,
      focus:territory.focus,
      signal:territory.signal,
      hidden:territory.hidden
    });
  }

  for(const moment of FAROL_MOMENTS){
    signals.push({
      source:'farol',
      sourceId:moment.slug,
      slug:moment.slug,
      label:moment.label,
      family:'Momento humano',
      focus:moment.question
    });
  }

  for(const axis of VPC_AXES){
    signals.push({
      source:'volta-para-casa',
      sourceId:axis.slug,
      slug:axis.slug,
      label:axis.label,
      family:'Dor dominante',
      focus:'eixo recorrente de reconhecimento pessoal'
    });
  }

  for(const seed of PDI_CONVERSATION_SEEDS){
    signals.push({
      source:'pdi-conversation',
      sourceId:seed.slug,
      slug:seed.slug,
      label:seed.label,
      family:'Conversa a dois',
      focus:seed.focus
    });
  }

  for(const seed of MAISON_NATIVE_SEEDS){
    signals.push({
      source:'maison-native',
      sourceId:seed.slug,
      slug:seed.slug,
      label:seed.label,
      family:'Não dito',
      focus:seed.focus
    });
  }

  for(const ocean of VPC_OCEAN_SIGNALS){
    for(const theme of ocean.themes||[]){
      const slug=normalize(theme);
      signals.push({
        source:'ocean',
        sourceId:ocean.id+':'+slug,
        slug,
        label:humanLabel(theme),
        family:'Ocean MAISON',
        focus:ocean.intent||ocean.painLanguage||'',
        oceanId:ocean.id
      });
    }
  }

  return signals;
}

export function groupExactThemeSignals(signals=buildPdiThemeSourceSignals()){
  const grouped=new Map();
  for(const signal of signals){
    const key=normalize(signal.label);
    if(!grouped.has(key)){
      grouped.set(key,{
        candidateKey:key,
        preferredLabel:signal.label,
        slugs:[],
        sources:[],
        evidence:[]
      });
    }
    const item=grouped.get(key);
    if(!item.slugs.includes(signal.slug))item.slugs.push(signal.slug);
    if(!item.sources.includes(signal.source))item.sources.push(signal.source);
    item.evidence.push({
      source:signal.source,
      sourceId:signal.sourceId,
      focus:signal.focus||'',
      family:signal.family||''
    });
  }
  return [...grouped.values()];
}

export function pdiThemeSourceStats(){
  const signals=buildPdiThemeSourceSignals();
  return {
    totalSignals:signals.length,
    oracle:signals.filter(x=>x.source==='oracle').length,
    farol:signals.filter(x=>x.source==='farol').length,
    voltaParaCasa:signals.filter(x=>x.source==='volta-para-casa').length,
    maisonNative:signals.filter(x=>x.source==='maison-native').length,
    pdiConversation:signals.filter(x=>x.source==='pdi-conversation').length,
    ocean:signals.filter(x=>x.source==='ocean').length,
    exactGroups:groupExactThemeSignals(signals).length
  };
}

function humanLabel(value){
  const text=String(value||'').trim();
  return text?text.charAt(0).toLocaleUpperCase('pt-PT')+text.slice(1):text;
}

function normalize(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/&/g,' e ')
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,'-');
}
