import { ORACLE_TERRITORIES } from './oracle-territories.js';

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
    exactGroups:groupExactThemeSignals(signals).length
  };
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
