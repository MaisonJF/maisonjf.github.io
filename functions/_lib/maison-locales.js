/*
MAISON JF® · Canonical paid-content locales
PT-PT is the editorial source. EN and ES are localized renderings of the same IDs.
*/

export const MAISON_CONTENT_LOCALES=Object.freeze(['pt-PT','en','es']);

export function normalizeMaisonLocale(value,{fallback='pt-PT'}={}){
  const raw=String(value||'').trim().replace(/_/g,'-').toLowerCase();
  if(!raw)return fallback;
  if(raw==='pt'||raw.startsWith('pt-'))return 'pt-PT';
  if(raw==='en'||raw.startsWith('en-'))return 'en';
  if(raw==='es'||raw.startsWith('es-'))return 'es';
  return fallback===null?null:fallback;
}

export function isMaisonLocale(value){
  return MAISON_CONTENT_LOCALES.includes(normalizeMaisonLocale(value,{fallback:null}));
}

export function stripeLocaleForMaison(value){
  const locale=normalizeMaisonLocale(value);
  return locale==='pt-PT'?'pt':locale;
}

export function publicLangForMaison(value){
  const locale=normalizeMaisonLocale(value);
  return locale==='pt-PT'?'pt':locale;
}
