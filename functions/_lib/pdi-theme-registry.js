import { buildPdiThemeSourceSignals } from './pdi-theme-sources.js';

const DEFAULT_AMOUNT=500;
const MINIMUM_LIVE_QUESTIONS=28;

const launch={
  slug:'relacoes',
  label:'Relações',
  family:'Relações & Vínculos',
  focus:'uma conversa a dois sobre vínculo, proximidade, diferença, desejo, cuidado e futuro',
  source:'launch',
  amount:DEFAULT_AMOUNT,
  currency:'eur'
};

const bySlug=new Map([[launch.slug,launch]]);
for(const signal of buildPdiThemeSourceSignals()){
  const slug=String(signal.slug||'').trim();
  if(!slug||bySlug.has(slug))continue;
  bySlug.set(slug,{
    slug,
    label:String(signal.label||slug),
    family:String(signal.family||'Maison'),
    focus:String(signal.focus||''),
    source:String(signal.source||'brain'),
    amount:DEFAULT_AMOUNT,
    currency:'eur'
  });
}

export const PDI_THEME_REGISTRY=Object.freeze([...bySlug.values()]);
export const PDI_MINIMUM_LIVE_QUESTIONS=MINIMUM_LIVE_QUESTIONS;

export function getPdiTheme(slug){
  const key=String(slug||'').trim();
  return PDI_THEME_REGISTRY.find(x=>x.slug===key)||null;
}

export function listPdiThemes(){
  return PDI_THEME_REGISTRY.map(x=>({...x}));
}

export function pdiThemeRegistryStats(){
  return {
    registered:PDI_THEME_REGISTRY.length,
    sourceThemes:PDI_THEME_REGISTRY.filter(x=>x.source!=='launch').length,
    minimumLiveQuestions:MINIMUM_LIVE_QUESTIONS,
    priceCents:DEFAULT_AMOUNT
  };
}
