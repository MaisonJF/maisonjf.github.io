/*
MAISON JF® · Private Brain Vault
Requires a Cloudflare D1 binding named MAISON_BRAIN_DB.
No paid question/oracle bodies belong in the public repository.
*/

export function requireMaisonVault(env){
  const db=env?.MAISON_BRAIN_DB;
  if(!db||typeof db.prepare!=='function'){
    const error=new Error('maison_vault_unavailable');
    error.code='MAISON_VAULT_UNAVAILABLE';
    throw error;
  }
  return db;
}

export async function pseudonymousBuyerKey({env,email,stripeSessionId}={}){
  const pepper=String(env?.MAISON_VAULT_PEPPER||'');
  if(!pepper)throw new Error('maison_vault_pepper_missing');
  const normalizedEmail=String(email||'').trim().toLowerCase();
  const identity=normalizedEmail?('email:'+normalizedEmail):('session:'+String(stripeSessionId||''));
  if(identity==='session:')throw new Error('buyer_identity_missing');
  const key=await crypto.subtle.importKey(
    'raw',new TextEncoder().encode(pepper),
    {name:'HMAC',hash:'SHA-256'},false,['sign']
  );
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(identity));
  return 'byr_'+hex(new Uint8Array(sig));
}

export async function listActivePaidQuestions(db,theme){
  const result=await db.prepare(
    `SELECT question_id AS id, theme, text, subthemes_json, class, stage, intensity,
            direction, time_scope, exposure, status, scores_json, viral_json,
            conflicts_json, pairs_json, similarity_group
       FROM vault_questions
      WHERE theme=?1 AND status='active' AND exposure='paid'
      ORDER BY question_id`
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
    scores:parseJson(row.scores_json,{}),
    viral:parseJson(row.viral_json,{}),
    conflictsWith:parseJson(row.conflicts_json,[]),
    pairsWellWith:parseJson(row.pairs_json,[]),
    similarityGroup:row.similarity_group||undefined
  }));
}

export async function listSeenQuestionIds(db,buyerKey,theme){
  const result=await db.prepare(
    `SELECT DISTINCT c.question_id
       FROM vault_game_session_cards c
       JOIN vault_game_sessions s ON s.game_session_id=c.game_session_id
      WHERE s.buyer_key=?1 AND s.theme=?2 AND s.status IN ('active','completed')`
  ).bind(buyerKey,theme).all();
  return (result.results||[]).map(row=>row.question_id);
}

export async function findGameSessionByStripe(db,stripeSessionId){
  return await db.prepare(
    `SELECT game_session_id,stripe_session_id,buyer_key,theme,seed,engine_version,status,created_at,completed_at
       FROM vault_game_sessions WHERE stripe_session_id=?1 LIMIT 1`
  ).bind(stripeSessionId).first();
}

export async function createGameSession(db,{gameSessionId,stripeSessionId,buyerKey,theme,seed,engineVersion,packA,packB}){
  const statements=[
    db.prepare(
      `INSERT INTO vault_game_sessions
       (game_session_id,stripe_session_id,buyer_key,theme,seed,engine_version,status)
       VALUES(?1,?2,?3,?4,?5,?6,'active')`
    ).bind(gameSessionId,stripeSessionId,buyerKey,theme,seed,engineVersion)
  ];
  for(const [pack,cards] of [['A',packA],['B',packB]]){
    cards.forEach((card,index)=>{
      statements.push(
        db.prepare(
          `INSERT INTO vault_game_session_cards(game_session_id,pack,position,question_id)
           VALUES(?1,?2,?3,?4)`
        ).bind(gameSessionId,pack,index+1,card.id)
      );
    });
  }
  await db.batch(statements);
  return gameSessionId;
}

export async function readGameSession(db,gameSessionId){
  const session=await db.prepare(
    `SELECT game_session_id,theme,engine_version,status,created_at,completed_at
       FROM vault_game_sessions WHERE game_session_id=?1 LIMIT 1`
  ).bind(gameSessionId).first();
  if(!session)return null;
  const cards=await db.prepare(
    `SELECT c.pack,c.position,q.question_id AS id,q.text,q.theme,q.class,q.stage,q.intensity
       FROM vault_game_session_cards c
       JOIN vault_questions q ON q.question_id=c.question_id
      WHERE c.game_session_id=?1
      ORDER BY CASE c.pack WHEN 'A' THEN 0 ELSE 1 END,c.position`
  ).bind(gameSessionId).all();
  const packA=[],packB=[];
  for(const card of (cards.results||[])){
    const clean={
      id:card.id,text:card.text,theme:card.theme,class:card.class,
      stage:card.stage,intensity:Number(card.intensity),position:Number(card.position)
    };
    (card.pack==='A'?packA:packB).push(clean);
  }
  return {...session,packA,packB};
}

export async function incrementQuestionMetric(db,questionId,event){
  const columns={
    shown:'shown_count',
    advanced:'advanced_count',
    passed:'passed_count',
    shared:'shared_count'
  };
  const column=columns[event];
  if(!column)throw new Error('unsupported_question_metric');
  await db.prepare(
    `INSERT INTO vault_question_metrics(question_id,${column})
     VALUES(?1,1)
     ON CONFLICT(question_id) DO UPDATE SET
       ${column}=${column}+1,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ).bind(questionId).run();
}

export async function markGameSessionCompleted(db,gameSessionId){
  await db.prepare(
    `UPDATE vault_game_sessions
        SET status='completed',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE game_session_id=?1 AND status='active'`
  ).bind(gameSessionId).run();
}

function parseJson(value,fallback){
  try{return JSON.parse(value)}catch{return fallback}
}
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
