/*
MAISON JF® · Localized paid-content helpers
The source editorial body remains PT-PT. EN/ES rows are renderings of the same canonical IDs.
*/
import { normalizeMaisonLocale } from './maison-locales.js';

export const ORACLE_REQUIRED_ROLES=Object.freeze([
  'opening','recognition','tension','counterpoint','reframe','movement','close'
]);

export async function vaultLocalizationReady(db){
  try{
    const row=await db.prepare("SELECT meta_value FROM vault_meta WHERE meta_key='schema_version' LIMIT 1").first();
    return row?.meta_value==='vault_v3';
  }catch{return false}
}

export async function countLiveQuestionsForLocale(db,theme,locale='pt-PT'){
  const selected=normalizeMaisonLocale(locale);
  if(selected==='pt-PT'){
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
  if(!await vaultLocalizationReady(db))return 0;
  const row=await db.prepare(
    `SELECT COUNT(*) AS count
       FROM vault_questions q
       JOIN vault_question_translations t
         ON t.question_id=q.question_id
        AND t.locale=?2
        AND t.status='active'
      WHERE q.theme=?1
        AND q.status='active'
        AND q.exposure='paid'
        AND q.lifecycle_state='live'
        AND q.rotation_state IN ('new','limited','normal')`
  ).bind(theme,selected).first();
  return Number(row?.count||0);
}

export async function oracleRoleCoverageForLocale(db,territory,locale='pt-PT'){
  const selected=normalizeMaisonLocale(locale);
  let rows;
  if(selected==='pt-PT'){
    rows=await db.prepare(
      `SELECT role,COUNT(*) AS count
         FROM vault_oracle_blocks
        WHERE territory=?1
          AND status='active'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
        GROUP BY role`
    ).bind(territory).all();
  }else{
    if(!await vaultLocalizationReady(db)){
      return {locale:selected,ready:false,roles:{},complete:false};
    }
    rows=await db.prepare(
      `SELECT b.role,COUNT(*) AS count
         FROM vault_oracle_blocks b
         JOIN vault_oracle_block_translations t
           ON t.block_id=b.block_id
          AND t.locale=?2
          AND t.status='active'
        WHERE b.territory=?1
          AND b.status='active'
          AND b.lifecycle_state='live'
          AND b.rotation_state IN ('new','limited','normal')
        GROUP BY b.role`
    ).bind(territory,selected).all();
  }
  const roles=Object.fromEntries((rows.results||[]).map(row=>[String(row.role),Number(row.count||0)]));
  const complete=ORACLE_REQUIRED_ROLES.every(role=>(roles[role]||0)>0);
  return {locale:selected,ready:true,roles,complete};
}
