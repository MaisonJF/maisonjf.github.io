import { requireMaisonVault } from './maison-vault.js';
import { getPdiTheme, listPdiThemes, PDI_MINIMUM_LIVE_QUESTIONS } from './pdi-theme-registry.js';
import { normalizeMaisonLocale } from './maison-locales.js';
import { countLiveQuestionsForLocale, vaultLocalizationReady } from './maison-localized-content.js';

export const PDI_PUBLIC_HIDDEN_THEME_SLUGS=Object.freeze(['amor-e-relacoes']);
const HIDDEN_PUBLIC_THEMES=new Set(PDI_PUBLIC_HIDDEN_THEME_SLUGS);

export function isPublicPdiTheme(slug){
  return !HIDDEN_PUBLIC_THEMES.has(String(slug||'').trim());
}

export async function countLivePdiQuestions(db,theme,locale='pt-PT'){
  return await countLiveQuestionsForLocale(db,theme,normalizeMaisonLocale(locale));
}

export async function pdiThemeAvailability(env,theme,locale='pt-PT'){
  const item=getPdiTheme(theme);
  if(!item||!isPublicPdiTheme(item.slug))return null;
  const db=requireMaisonVault(env);
  const selectedLocale=normalizeMaisonLocale(locale);
  const liveQuestions=await countLivePdiQuestions(db,item.slug,selectedLocale);
  return {
    ...item,
    locale:selectedLocale,
    available:liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS,
    liveQuestions
  };
}

export async function listAvailablePdiThemes(env,locale='pt-PT'){
  const selectedLocale=normalizeMaisonLocale(locale);
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
  return listPdiThemes()
    .filter(item=>isPublicPdiTheme(item.slug))
    .map(item=>({...item,locale:selectedLocale,liveQuestions:counts.get(item.slug)||0}))
    .filter(item=>item.liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS);
}
