import {normalizeVaultVpcRow} from './vpc-question-engine.js';

export async function listActivePublicVpcQuestions(db,test){
  const theme=themeForTest(test);
  if(!theme)return [];
  try{
    const result=await db.prepare(
      `SELECT question_id,text,theme,product_fit_json,source_ocean_id,status,exposure,lifecycle_state,rotation_state
         FROM vault_questions
        WHERE status='active'
          AND exposure='public_social'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
          AND theme=?1
        ORDER BY question_id`
    ).bind(theme).all();

    return (result.results||[])
      .map(normalizeVaultVpcRow)
      .filter(Boolean);
  }catch{
    return [];
  }
}

function themeForTest(test){
  const value=String(test||'').toLowerCase();
  if(value==='attention'||value==='atencao')return 'vpc-attention';
  if(value==='apego'||value==='attachment')return 'vpc-apego';
  if(value==='afeto'||value==='afecto'||value==='affection')return 'vpc-afeto';
  return '';
}
