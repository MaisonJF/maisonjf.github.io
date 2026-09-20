import { groupExactThemeSignals } from './pdi-theme-sources.js';

const DEFAULT_AMOUNT=500;
const MINIMUM_LIVE_QUESTIONS=28;

const curated=[
  {
    slug:'relacoes',
    label:'Relações',
    family:'Relações & Vínculos',
    focus:'uma conversa a dois sobre vínculo, proximidade, diferença, desejo, cuidado e futuro',
    source:'curated',
    aliases:[],
    amount:DEFAULT_AMOUNT,
    currency:'eur'
  },
  {
    slug:'amor-sem-filtro',
    label:'Amor sem Filtro',
    family:'Relações & Vínculos',
    focus:'reciprocidade, ciúme, confiança, vulnerabilidade, desejo, medo de perder, dúvida, escolha e verdades difíceis',
    source:'curated',
    aliases:[],
    amount:DEFAULT_AMOUNT,
    currency:'eur'
  }
];

const themes=[...curated];
for(const group of groupExactThemeSignals()){
  const evidence=group.evidence?.[0]||{};
  themes.push({
    slug:String(group.candidateKey),
    label:String(group.preferredLabel||group.candidateKey),
    family:String(evidence.family||'Maison'),
    focus:String(evidence.focus||''),
    source:(group.sources||[]).join('+')||'brain',
    aliases:[...(group.slugs||[])],
    amount:DEFAULT_AMOUNT,
    currency:'eur'
  });
}

export const PDI_THEME_REGISTRY=Object.freeze(themes);
export const PDI_MINIMUM_LIVE_QUESTIONS=MINIMUM_LIVE_QUESTIONS;

export function getPdiTheme(slug){
  const key=String(slug||'').trim();
  return PDI_THEME_REGISTRY.find(x=>x.slug===key)||null;
}

export function listPdiThemes(){
  return PDI_THEME_REGISTRY.map(x=>({...x,aliases:[...(x.aliases||[])]}));
}

export function pdiThemeRegistryStats(){
  return {
    registered:PDI_THEME_REGISTRY.length,
    sourceThemes:PDI_THEME_REGISTRY.filter(x=>x.source!=='curated').length,
    curatedThemes:PDI_THEME_REGISTRY.filter(x=>x.source==='curated').length,
    minimumLiveQuestions:MINIMUM_LIVE_QUESTIONS,
    priceCents:DEFAULT_AMOUNT
  };
}
