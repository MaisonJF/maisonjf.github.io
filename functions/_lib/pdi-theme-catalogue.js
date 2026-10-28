import { requireMaisonVault } from './maison-vault.js';
import { getPdiTheme, listPdiThemes, getPdiPriceForLocale, PDI_MINIMUM_LIVE_QUESTIONS } from './pdi-theme-registry.js';
import { normalizeMaisonLocale } from './maison-locales.js';
import { countLiveQuestionsForLocale, vaultLocalizationReady } from './maison-localized-content.js';
import { localizeOracleLabel } from './oracle-public-locales.js';

export const PDI_PUBLIC_HIDDEN_THEME_SLUGS=Object.freeze(['amor-e-relacoes']);
const HIDDEN_PUBLIC_THEMES=new Set(PDI_PUBLIC_HIDDEN_THEME_SLUGS);
const PDI_CATALOGUE_CACHE_TTL_MS=5*60*1000;
const PDI_CATALOGUE_CACHE=new Map();

function cachedCatalogue(key){
  const hit=PDI_CATALOGUE_CACHE.get(key);
  if(!hit||hit.expiresAt<=Date.now()){
    if(hit)PDI_CATALOGUE_CACHE.delete(key);
    return null;
  }
  return structuredClone(hit.value);
}
function storeCatalogue(key,value){
  PDI_CATALOGUE_CACHE.set(key,{value:structuredClone(value),expiresAt:Date.now()+PDI_CATALOGUE_CACHE_TTL_MS});
  return value;
}

const PDI_LABELS={
  'pt-BR':{
    'Relações':'Relações','Amor sem Filtro':'Amor sem Filtro',
    'Momento humano':'Momento humano','Dor dominante':'Dor dominante',
    'Conversa a dois':'Conversa a dois','Não dito':'Não dito','Ocean MAISON':'Ocean MAISON',
    'Maison':'Maison'
  },
  en:{
    'Relações':'Relationships','Amor sem Filtro':'Love Unfiltered',
    'Momento humano':'Human moment','Dor dominante':'Dominant pain',
    'Conversa a dois':'Conversation for two','Não dito':'Unsaid','Ocean MAISON':'MAISON Ocean',
    'Maison':'Maison'
  },
  es:{
    'Relações':'Relaciones','Amor sem Filtro':'Amor sin Filtros',
    'Momento humano':'Momento humano','Dor dominante':'Dolor dominante',
    'Conversa a dois':'Conversación de dos','Não dito':'Lo no dicho','Ocean MAISON':'Océano MAISON',
    'Maison':'Maison'
  }
};

function localizePdiText(value,locale){
  const text=String(value||'');
  if(locale==='pt-PT')return text;
  return PDI_LABELS[locale]?.[text]||localizeOracleLabel(text,locale)||text;
}

function safeThemeSlug(value){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/&/g,' e ')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .replace(/-+/g,'-');
}
function validDynamicThemeSlug(value){
  const slug=String(value||'');
  return slug.length>=2 && slug.length<=120
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    && safeThemeSlug(slug)===slug;
}
function dynamicTheme(slug){
  if(!validDynamicThemeSlug(slug))return null;
  const words=slug.split('-');
  const label=words.map(word=>word.charAt(0).toLocaleUpperCase('pt-PT')+word.slice(1)).join(' ');
  return {
    slug,label,family:'Novos temas MAISON',focus:'',
    source:'vault-dynamic',aliases:[],
    amount:500,currency:'eur'
  };
}

function localizePdiTheme(item,locale){
  const price=getPdiPriceForLocale(locale);
  return {
    ...item,
    label:localizePdiText(item.label,locale),
    family:localizePdiText(item.family,locale),
    ...price
  };
}

export function isPublicPdiTheme(slug){
  return !HIDDEN_PUBLIC_THEMES.has(String(slug||'').trim());
}

function themeKeys(item){
  return [...new Set([item?.slug,...(item?.aliases||[])].map(value=>String(value||'').trim()).filter(Boolean))];
}

export async function countLivePdiQuestions(db,theme,locale='pt-PT'){
  const item=theme&&typeof theme==='object'?theme:getPdiTheme(theme);
  const keys=item?themeKeys(item):[String(theme||'').trim()];
  return await countLiveQuestionsForLocale(db,keys,normalizeMaisonLocale(locale));
}

export async function pdiThemeAvailability(env,theme,locale='pt-PT'){
  const selectedLocale=normalizeMaisonLocale(locale);
  const db=requireMaisonVault(env);
  let item=getPdiTheme(theme);
  if(!item){
    const candidate=dynamicTheme(theme);
    if(candidate){
      const row=await db.prepare(
        `SELECT theme FROM vault_questions
          WHERE theme=?1 AND status='active' AND exposure='paid'
            AND lifecycle_state='live'
          LIMIT 1`
      ).bind(candidate.slug).first();
      if(row)item=candidate;
    }
  }
  if(!item||!isPublicPdiTheme(item.slug))return null;
  const cacheKey='availability:'+selectedLocale+':'+item.slug;
  const cached=cachedCatalogue(cacheKey);
  if(cached)return cached;
  const liveQuestions=await countLivePdiQuestions(db,item,selectedLocale);
  return storeCatalogue(cacheKey,{
    ...localizePdiTheme(item,selectedLocale),
    locale:selectedLocale,
    available:liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS,
    liveQuestions
  });
}

export async function listAvailablePdiThemes(env,locale='pt-PT'){
  const selectedLocale=normalizeMaisonLocale(locale);
  const cacheKey='list:'+selectedLocale;
  const cached=cachedCatalogue(cacheKey);
  if(cached)return cached;
  const db=requireMaisonVault(env);
  let rows;
  if(selectedLocale==='pt-PT'){
    rows=await db.prepare(
      `SELECT theme,COUNT(*) AS count
         FROM vault_questions
        WHERE status='active'
          AND exposure='paid'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
        GROUP BY theme`
    ).all();
  }else{
    if(!await vaultLocalizationReady(db))return [];
    rows=await db.prepare(
      `SELECT q.theme,COUNT(*) AS count
         FROM vault_questions q
         JOIN vault_question_translations t
           ON t.question_id=q.question_id
          AND t.locale=?1
          AND t.status='active'
        WHERE q.status='active'
          AND q.exposure='paid'
          AND q.lifecycle_state='live'
          AND q.rotation_state IN ('new','limited','normal')
        GROUP BY q.theme`
    ).bind(selectedLocale).all();
  }
  const counts=new Map((rows.results||[]).map(row=>[String(row.theme),Number(row.count||0)]));
  const registeredSource=listPdiThemes().filter(item=>isPublicPdiTheme(item.slug));
  const known=new Set();
  const registered=registeredSource.map(item=>{
    const keys=themeKeys(item);
    for(const key of keys)known.add(key);
    const liveQuestions=keys.reduce((total,key)=>total+(counts.get(key)||0),0);
    return {
      ...localizePdiTheme(item,selectedLocale),
      locale:selectedLocale,
      liveQuestions
    };
  });
  const discovered=[];
  for(const [slug,count] of counts){
    if(known.has(slug)||!isPublicPdiTheme(slug)||!validDynamicThemeSlug(slug))continue;
    const item=dynamicTheme(slug);
    if(!item)continue;
    discovered.push({
      ...localizePdiTheme(item,selectedLocale),
      locale:selectedLocale,
      liveQuestions:count
    });
  }
  const themes=[...registered,...discovered]
    .filter(item=>item.liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS)
    .sort((a,b)=>a.label.localeCompare(b.label,selectedLocale));
  return storeCatalogue(cacheKey,themes);
}
