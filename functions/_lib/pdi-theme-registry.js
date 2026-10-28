import { groupExactThemeSignals } from './pdi-theme-sources.js';
import { normalizeMaisonLocale } from './maison-locales.js';

const DEFAULT_AMOUNT=500;
const MINIMUM_LIVE_QUESTIONS=28;

function stableThemeSlug(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/&/g,' e ')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .replace(/-+/g,'-');
}

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
  const groupEvidence=(group.evidence||[]).find(item=>item.source==='pdi-group')||null;
  const label=String(groupEvidence?.label||group.preferredLabel||group.candidateKey);
  // Keep the published PDI group slug as the canonical key, while retaining
  // older labels/keys as aliases so existing Vault questions remain usable.
  const slug=String(groupEvidence?.sourceId||stableThemeSlug(label)||group.candidateKey);
  const aliases=[...new Set([
    group.candidateKey,
    group.preferredLabel,
    ...(group.slugs||[]),
    ...((group.evidence||[]).map(item=>item.sourceId)),
    ...((group.evidence||[]).map(item=>item.label))
  ].map(value=>String(value||'').trim()).filter(Boolean))].filter(value=>value!==slug);
  themes.push({
    slug,
    label,
    family:String(groupEvidence?.family||evidence.family||'Maison'),
    focus:String(groupEvidence?.focus||evidence.focus||''),
    source:(group.sources||[]).join('+')||'brain',
    aliases,
    amount:DEFAULT_AMOUNT,
    currency:'eur'
  });
}

export const PDI_THEME_REGISTRY=Object.freeze(themes);
export const PDI_MINIMUM_LIVE_QUESTIONS=MINIMUM_LIVE_QUESTIONS;

export function getPdiPriceForLocale(locale='pt-PT'){
  const selected=normalizeMaisonLocale(locale);
  return selected==='pt-BR'
    ? {amount:1990,currency:'brl'}
    : {amount:DEFAULT_AMOUNT,currency:'eur'};
}

export function getPdiTheme(slug){
  const key=String(slug||'').trim();
  return PDI_THEME_REGISTRY.find(item=>item.slug===key||item.aliases.includes(key))||null;
}

export function listPdiThemes(){
  return PDI_THEME_REGISTRY.map(item=>({...item,aliases:[...(item.aliases||[])]}));
}

export function pdiThemeRegistryStats(){
  return {
    registered:PDI_THEME_REGISTRY.length,
    sourceThemes:PDI_THEME_REGISTRY.filter(item=>item.source!=='curated').length,
    curatedThemes:PDI_THEME_REGISTRY.filter(item=>item.source==='curated').length,
    groupThemes:PDI_THEME_REGISTRY.filter(item=>item.family==='Amigos, Grupos & Festas').length,
    minimumLiveQuestions:MINIMUM_LIVE_QUESTIONS,
    priceCents:DEFAULT_AMOUNT
  };
}
