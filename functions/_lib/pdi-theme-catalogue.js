import { requireMaisonVault } from './maison-vault.js';
import { getPdiTheme, listPdiThemes, PDI_MINIMUM_LIVE_QUESTIONS } from './pdi-theme-registry.js';

export async function countLivePdiQuestions(db,theme){
  const row=await db.prepare(
    `SELECT COUNT(*) AS count
       FROM vault_questions
      WHERE theme=?1
        AND status='active'
        AND exposure='paid'
        AND lifecycle_state='live'
        AND rotation_state IN ('new','limited','normal')`
  ).bind(theme).first();
  return Number(row?.count||0);
}

export async function pdiThemeAvailability(env,theme){
  const item=getPdiTheme(theme);
  if(!item)return null;
  const db=requireMaisonVault(env);
  const liveQuestions=await countLivePdiQuestions(db,item.slug);
  return {
    ...item,
    available:liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS,
    liveQuestions
  };
}

export async function listAvailablePdiThemes(env){
  const db=requireMaisonVault(env);
  const rows=await db.prepare(
    `SELECT theme,COUNT(*) AS count
       FROM vault_questions
      WHERE status='active'
        AND exposure='paid'
        AND lifecycle_state='live'
        AND rotation_state IN ('new','limited','normal')
      GROUP BY theme`
  ).all();
  const counts=new Map((rows.results||[]).map(row=>[String(row.theme),Number(row.count||0)]));
  return listPdiThemes()
    .map(item=>({...item,liveQuestions:counts.get(item.slug)||0}))
    .filter(item=>item.liveQuestions>=PDI_MINIMUM_LIVE_QUESTIONS);
}
