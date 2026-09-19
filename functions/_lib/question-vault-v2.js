/*
MAISON JF® · PÁRA DE IGNORAR! Vault v2 reader
Returns private question bodies only to server-side composition code.
*/

export async function listActivePaidQuestionsV2(db,theme){
  const result=await db.prepare(
    `SELECT q.question_id AS id,q.theme,q.text,q.subthemes_json,q.class,q.stage,q.intensity,
            q.direction,q.time_scope,q.exposure,q.status,q.scores_json,q.viral_json,
            q.conflicts_json,q.pairs_json,q.similarity_group,
            q.pain_family,q.subterritory,q.target,q.emotional_function,
            q.cognitive_load,q.vulnerability,q.conflict_potential,q.playfulness,
            q.semantic_fingerprint,q.compatibility_json,q.product_fit_json,
            q.lifecycle_state,q.rotation_state,q.source_ocean_id,q.quality_version,
            coalesce(m.shown_count,0) AS shown_count,
            coalesce(m.advanced_count,0) AS advanced_count,
            coalesce(m.passed_count,0) AS passed_count,
            coalesce(m.shared_count,0) AS shared_count,
            coalesce(m.completed_session_count,0) AS completed_session_count
       FROM vault_questions q
       LEFT JOIN vault_question_metrics m ON m.question_id=q.question_id
      WHERE q.theme=?1
        AND q.status='active'
        AND q.exposure='paid'
        AND q.lifecycle_state='live'
        AND q.rotation_state IN ('new','limited','normal')
      ORDER BY q.question_id`
  ).bind(theme).all();

  return (result.results||[]).map(row=>({
    id:row.id,
    theme:row.theme,
    text:row.text,
    subthemes:parseJson(row.subthemes_json,[]),
    class:row.class,
    stage:row.stage,
    intensity:Number(row.intensity),
    direction:row.direction||undefined,
    time:row.time_scope||undefined,
    exposure:row.exposure,
    status:row.status,
    painFamily:row.pain_family||undefined,
    subterritory:row.subterritory||undefined,
    target:row.target||undefined,
    emotionalFunction:row.emotional_function||undefined,
    cognitiveLoad:numberOrUndefined(row.cognitive_load),
    vulnerability:numberOrUndefined(row.vulnerability),
    conflictPotential:numberOrUndefined(row.conflict_potential),
    playfulness:numberOrUndefined(row.playfulness),
    semanticFingerprint:row.semantic_fingerprint||undefined,
    compatibility:parseJson(row.compatibility_json,{}),
    productFit:parseJson(row.product_fit_json,{}),
    lifecycleState:row.lifecycle_state,
    rotationState:row.rotation_state,
    sourceOceanId:row.source_ocean_id||undefined,
    qualityVersion:row.quality_version||undefined,
    scores:parseJson(row.scores_json,{}),
    viral:parseJson(row.viral_json,{}),
    conflictsWith:parseJson(row.conflicts_json,[]),
    pairsWellWith:parseJson(row.pairs_json,[]),
    similarityGroup:row.similarity_group||undefined,
    metrics:{
      shown:Number(row.shown_count||0),
      advanced:Number(row.advanced_count||0),
      passed:Number(row.passed_count||0),
      shared:Number(row.shared_count||0),
      completedSessions:Number(row.completed_session_count||0)
    }
  }));
}

function parseJson(value,fallback){try{return JSON.parse(value)}catch{return fallback}}
function numberOrUndefined(value){
  if(value==null)return undefined;
  const n=Number(value);
  return Number.isFinite(n)?n:undefined;
}
