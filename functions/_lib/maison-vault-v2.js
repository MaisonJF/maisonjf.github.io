/*
MAISON JF® · Private Brain Vault v2 helpers
Only call v2 queries after vaultExperienceEngineReady() returns true.
*/

export async function vaultExperienceEngineReady(db){
  try{
    const row=await db.prepare("SELECT meta_value FROM vault_meta WHERE meta_key='schema_version' LIMIT 1").first();
    return row?.meta_value==='vault_v2';
  }catch{return false}
}

export async function listActiveOracleBlocks(db,territory){
  const result=await db.prepare(
    `SELECT b.block_id AS id,b.canonical_key,b.territory,b.role,b.intensity,b.text,b.title,
            b.pain_family,b.subterritory,b.tone,b.emotional_function,b.semantic_fingerprint,
            b.tags_json,b.compatibility_json,b.scores_json,b.product_fit_json,
            b.lifecycle_state,b.rotation_state,b.rarity,b.source_ocean_id,b.quality_version,
            coalesce(m.served_count,0) AS served_count,
            coalesce(m.completed_count,0) AS completed_count,
            coalesce(m.reopened_count,0) AS reopened_count,
            coalesce(m.shared_count,0) AS shared_count,
            coalesce(m.quality_failure_count,0) AS quality_failure_count,
            b.status
       FROM vault_oracle_blocks b
       LEFT JOIN vault_oracle_block_metrics m ON m.block_id=b.block_id
      WHERE b.status='active'
        AND b.lifecycle_state='live'
        AND b.rotation_state IN ('new','limited','normal')
        AND b.territory IN (?1,'global')
      ORDER BY b.role,b.block_id`
  ).bind(territory).all();
  return (result.results||[]).map(row=>({
    id:row.id,
    canonicalKey:row.canonical_key,
    territory:row.territory,
    role:row.role,
    intensity:Number(row.intensity),
    text:row.text,
    title:row.title||undefined,
    painFamily:row.pain_family||undefined,
    subterritory:row.subterritory||undefined,
    tone:row.tone||undefined,
    emotionalFunction:row.emotional_function||undefined,
    semanticFingerprint:row.semantic_fingerprint||undefined,
    tags:parseJson(row.tags_json,[]),
    compatibility:parseJson(row.compatibility_json,{}),
    scores:parseJson(row.scores_json,{}),
    productFit:parseJson(row.product_fit_json,{}),
    lifecycleState:row.lifecycle_state,
    rotationState:row.rotation_state,
    rarity:row.rarity,
    sourceOceanId:row.source_ocean_id||undefined,
    qualityVersion:row.quality_version||undefined,
    status:row.status,
    metrics:{
      served:Number(row.served_count||0),
      completed:Number(row.completed_count||0),
      reopened:Number(row.reopened_count||0),
      shared:Number(row.shared_count||0),
      qualityFailures:Number(row.quality_failure_count||0)
    }
  }));
}

export async function listSeenOracleBlockIds(db,buyerKey,territory){
  const result=await db.prepare(
    `SELECT DISTINCT b.block_id
       FROM vault_oracle_session_blocks b
       JOIN vault_oracle_sessions s ON s.oracle_session_id=b.oracle_session_id
      WHERE s.buyer_key=?1 AND s.territory=?2 AND s.status IN ('active','completed')`
  ).bind(buyerKey,territory).all();
  return (result.results||[]).map(row=>row.block_id);
}

export async function findOracleSessionByStripe(db,stripeSessionId){
  return await db.prepare(
    `SELECT oracle_session_id,stripe_session_id,buyer_key,territory,seed,trajectory,tone,intensity,
            director_version,composer_version,quality_version,quality_json,status,created_at,completed_at
       FROM vault_oracle_sessions WHERE stripe_session_id=?1 LIMIT 1`
  ).bind(stripeSessionId).first();
}

export async function createOracleSession(db,{oracleSessionId,stripeSessionId,buyerKey,composed}){
  const statements=[
    db.prepare(
      `INSERT INTO vault_oracle_sessions
       (oracle_session_id,stripe_session_id,buyer_key,territory,seed,trajectory,tone,intensity,
        director_version,composer_version,quality_version,quality_json,status)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'active')`
    ).bind(
      oracleSessionId,stripeSessionId,buyerKey,composed.territory,composed.seed,composed.trajectory,
      composed.tone,composed.intensity,composed.directorVersion,composed.engineVersion,
      composed.qualityVersion,JSON.stringify(composed.quality||{})
    )
  ];
  composed.blocks.forEach((block,index)=>{
    statements.push(
      db.prepare(
        `INSERT INTO vault_oracle_session_blocks(oracle_session_id,position,role,block_id)
         VALUES(?1,?2,?3,?4)`
      ).bind(oracleSessionId,index+1,block.role,block.id)
    );
    statements.push(
      db.prepare(
        `INSERT INTO vault_oracle_block_metrics(block_id,served_count)
         VALUES(?1,1)
         ON CONFLICT(block_id) DO UPDATE SET
           served_count=served_count+1,
           updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      ).bind(block.id)
    );
  });
  await db.batch(statements);
  try{
    await recordExperienceSignal(db,{
      product:'oracle',
      eventType:'served',
      contentType:'session',
      contentId:oracleSessionId,
      buyerKey,
      territory:composed.territory,
      signalKey:['oracle','served','session',oracleSessionId].join('|')
    });
    for(const block of composed.blocks){
      await recordExperienceSignal(db,{
        product:'oracle',
        eventType:'served',
        contentType:'oracle_block',
        contentId:block.id,
        buyerKey,
        territory:composed.territory,
        signalKey:['oracle','served',oracleSessionId,block.id].join('|')
      });
    }
  }catch{}
  return oracleSessionId;
}

export async function readOracleSession(db,oracleSessionId){
  const session=await db.prepare(
    `SELECT oracle_session_id,territory,trajectory,tone,intensity,director_version,composer_version,
            quality_version,quality_json,status,created_at,completed_at
       FROM vault_oracle_sessions WHERE oracle_session_id=?1 LIMIT 1`
  ).bind(oracleSessionId).first();
  if(!session)return null;
  const rows=await db.prepare(
    `SELECT sb.position,sb.role,b.block_id AS id,b.title,b.text,b.intensity
       FROM vault_oracle_session_blocks sb
       JOIN vault_oracle_blocks b ON b.block_id=sb.block_id
      WHERE sb.oracle_session_id=?1 ORDER BY sb.position`
  ).bind(oracleSessionId).all();
  const blocks=(rows.results||[]).map(row=>({
    id:row.id,title:row.title||undefined,text:row.text,role:row.role,
    intensity:Number(row.intensity),position:Number(row.position)
  }));
  return {
    ...session,
    quality:parseJson(session.quality_json,{}),
    reading:{
      id:session.oracle_session_id,
      title:blocks.find(x=>x.role==='opening')?.title||'Uma abertura',
      text:blocks.map(x=>String(x.text||'').trim()).filter(Boolean).join('\n\n')
    },
    blocks
  };
}

export async function upsertContentNeed(db,need){
  const key=[
    need.targetType||'',
    need.territory||'',
    need.subterritory||'',
    need.stageOrRole||'',
    need.tone||'',
    need.intensityMin??'',
    need.intensityMax??'',
    need.reasonCode||'',
    need.metadata?.target||''
  ].join('|');
  const id=need.needId||('need_'+(await digestHex(key)).slice(0,40));
  await db.prepare(
    `INSERT INTO vault_content_needs
     (need_id,target_type,territory,subterritory,stage_or_role,tone,intensity_min,intensity_max,reason_code,priority,status,metadata_json)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'open',?11)
     ON CONFLICT(need_id) DO UPDATE SET
       priority=excluded.priority,
       metadata_json=excluded.metadata_json,
       status=CASE WHEN vault_content_needs.status='dismissed' THEN 'dismissed' ELSE 'open' END,
       resolved_at=NULL`
  ).bind(
    id,need.targetType,need.territory||null,need.subterritory||null,need.stageOrRole||null,
    need.tone||null,need.intensityMin??null,need.intensityMax??null,need.reasonCode,
    Number(need.priority??50),JSON.stringify(need.metadata||{})
  ).run();
  return id;
}


export async function recordExperienceSignal(db,{
  product,eventType,contentType=null,contentId=null,buyerKey=null,territory=null,
  metadata={},signalKey=null
}={}){
  if(!product||!eventType)throw new Error('experience_signal_fields_required');
  const key=signalKey||[product,eventType,contentType||'',contentId||'',buyerKey||'',territory||''].join('|');
  const signalId='sig_'+(await digestHex(key)).slice(0,40);
  const result=await db.prepare(
    `INSERT OR IGNORE INTO vault_experience_signals
     (signal_id,product,event_type,content_type,content_id,buyer_key,territory,metadata_json)
     VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`
  ).bind(
    signalId,product,eventType,contentType,contentId,buyerKey,territory,
    JSON.stringify(metadata||{})
  ).run();
  return {signalId,inserted:Number(result?.meta?.changes??result?.changes??0)>0};
}

export async function recordQuestionSessionServedV2(db,{gameSessionId,buyerKey,theme,questionIds=[]}={}){
  if(!gameSessionId||!buyerKey||!theme)throw new Error('question_session_signal_fields_required');
  const unique=[...new Set((questionIds||[]).filter(Boolean))];
  await recordExperienceSignal(db,{
    product:'para_de_ignorar',
    eventType:'served',
    contentType:'session',
    contentId:gameSessionId,
    buyerKey,
    territory:theme,
    signalKey:['pdi','served','session',gameSessionId].join('|')
  });
  for(const questionId of unique){
    const signal=await recordExperienceSignal(db,{
      product:'para_de_ignorar',
      eventType:'served',
      contentType:'question',
      contentId:questionId,
      buyerKey,
      territory:theme,
      signalKey:['pdi','served',gameSessionId,questionId].join('|')
    });
    if(signal.inserted){
      await db.prepare(
        `INSERT INTO vault_question_metrics(question_id,shown_count)
         VALUES(?1,1)
         ON CONFLICT(question_id) DO UPDATE SET
           shown_count=shown_count+1,
           updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      ).bind(questionId).run();
    }
  }
}

export async function recordQuestionInteractionV2(db,{
  gameSessionId,buyerKey,theme,questionId,eventType
}={}){
  if(!['advanced','passed','shared'].includes(eventType))throw new Error('unsupported_question_event');
  if(!gameSessionId||!buyerKey||!theme||!questionId)throw new Error('question_event_fields_required');
  const signal=await recordExperienceSignal(db,{
    product:'para_de_ignorar',
    eventType,
    contentType:'question',
    contentId:questionId,
    buyerKey,
    territory:theme,
    signalKey:['pdi',eventType,gameSessionId,questionId].join('|')
  });
  if(!signal.inserted)return false;
  const column={advanced:'advanced_count',passed:'passed_count',shared:'shared_count'}[eventType];
  await db.prepare(
    `INSERT INTO vault_question_metrics(question_id,${column})
     VALUES(?1,1)
     ON CONFLICT(question_id) DO UPDATE SET
       ${column}=${column}+1,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ).bind(questionId).run();
  return true;
}

export async function markQuestionSessionCompletedV2(db,{gameSessionId,buyerKey,theme}={}){
  if(!gameSessionId||!buyerKey||!theme)throw new Error('question_complete_fields_required');
  const signal=await recordExperienceSignal(db,{
    product:'para_de_ignorar',
    eventType:'completed',
    contentType:'session',
    contentId:gameSessionId,
    buyerKey,
    territory:theme,
    signalKey:['pdi','completed','session',gameSessionId].join('|')
  });
  await db.prepare(
    `UPDATE vault_game_sessions
        SET status='completed',completed_at=coalesce(completed_at,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      WHERE game_session_id=?1`
  ).bind(gameSessionId).run();
  if(!signal.inserted)return false;
  const rows=await db.prepare(
    `SELECT DISTINCT question_id FROM vault_game_session_cards WHERE game_session_id=?1`
  ).bind(gameSessionId).all();
  for(const row of (rows.results||[])){
    await db.prepare(
      `INSERT INTO vault_question_metrics(question_id,completed_session_count)
       VALUES(?1,1)
       ON CONFLICT(question_id) DO UPDATE SET
         completed_session_count=completed_session_count+1,
         updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
    ).bind(row.question_id).run();
  }
  return true;
}

export async function recordOracleSessionReopenedV2(db,{oracleSessionId,buyerKey,territory}={}){
  if(!oracleSessionId||!buyerKey||!territory)throw new Error('oracle_reopen_fields_required');
  const signal=await recordExperienceSignal(db,{
    product:'oracle',
    eventType:'reopened',
    contentType:'session',
    contentId:oracleSessionId,
    buyerKey,
    territory,
    signalKey:['oracle','reopened',oracleSessionId,new Date().toISOString().slice(0,10)].join('|')
  });
  if(!signal.inserted)return false;
  await db.prepare(
    `UPDATE vault_oracle_block_metrics
        SET reopened_count=reopened_count+1,
            updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE block_id IN (
        SELECT block_id FROM vault_oracle_session_blocks WHERE oracle_session_id=?1
      )`
  ).bind(oracleSessionId).run();
  return true;
}


export async function summarizeExperienceCatalogue(db){
  const [questionRows,oracleRows,needRows]=await Promise.all([
    db.prepare(
      `SELECT theme,stage,COUNT(*) AS count
         FROM vault_questions
        WHERE status='active'
          AND exposure='paid'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
        GROUP BY theme,stage
        ORDER BY theme,stage`
    ).all(),
    db.prepare(
      `SELECT territory,role,COUNT(*) AS count
         FROM vault_oracle_blocks
        WHERE status='active'
          AND lifecycle_state='live'
          AND rotation_state IN ('new','limited','normal')
        GROUP BY territory,role
        ORDER BY territory,role`
    ).all(),
    db.prepare(
      `SELECT target_type,coalesce(territory,'') AS territory,COUNT(*) AS count,
              MAX(priority) AS max_priority
         FROM vault_content_needs
        WHERE status IN ('open','in_progress')
        GROUP BY target_type,coalesce(territory,'')
        ORDER BY target_type,territory`
    ).all()
  ]);

  const questions=groupCatalogue(questionRows.results||[],'theme','stage');
  const oracle=groupCatalogue(oracleRows.results||[],'territory','role');
  const openNeeds=(needRows.results||[]).map(row=>({
    targetType:row.target_type,
    territory:row.territory||null,
    count:Number(row.count||0),
    maxPriority:Number(row.max_priority||0)
  }));
  return {
    questions:{
      total:questions.reduce((n,x)=>n+x.total,0),
      byTheme:questions
    },
    oracle:{
      total:oracle.reduce((n,x)=>n+x.total,0),
      byTerritory:oracle
    },
    openNeeds:{
      total:openNeeds.reduce((n,x)=>n+x.count,0),
      groups:openNeeds
    }
  };
}

function groupCatalogue(rows,groupKey,detailKey){
  const map=new Map();
  for(const row of rows){
    const name=String(row[groupKey]||'');
    if(!name)continue;
    if(!map.has(name))map.set(name,{name,total:0,breakdown:{}});
    const entry=map.get(name);
    const count=Number(row.count||0);
    entry.total+=count;
    entry.breakdown[String(row[detailKey]||'unknown')]=count;
  }
  return [...map.values()];
}

async function digestHex(value){
  const bytes=new Uint8Array(await crypto.subtle.digest(
    'SHA-256',new TextEncoder().encode(String(value))
  ));
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function parseJson(value,fallback){try{return JSON.parse(value)}catch{return fallback}}
