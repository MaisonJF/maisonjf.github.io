const SOURCE_KINDS=['ocean_mcp_candidate','ocean_seed_candidate'];
const MAX_LIST=500;
const MAX_ACTION=1000;

function clampLimit(value){
  const n=Number(value||100);
  return Number.isFinite(n)?Math.max(1,Math.min(MAX_LIST,Math.floor(n))):100;
}
function normalizeType(value){
  const type=String(value||'all').trim();
  if(!['all','question','oracle_block'].includes(type))throw new Error('invalid_content_type');
  return type;
}
function normalizeState(value){
  const state=String(value||'candidate').trim();
  if(!['candidate','review','all'].includes(state))throw new Error('invalid_state');
  return state;
}
function normalizeItems(items){
  if(!Array.isArray(items)||!items.length)throw new Error('items_required');
  if(items.length>MAX_ACTION)throw new Error('too_many_items');
  const out=[];
  const seen=new Set();
  for(const item of items){
    const type=normalizeType(item?.content_type);
    if(type==='all')throw new Error('invalid_item_type');
    const id=String(item?.content_id||'').trim();
    const ok=type==='question'?/^q_[A-Za-z0-9_-]{4,180}$/.test(id):/^ob_[A-Za-z0-9_-]{4,180}$/.test(id);
    if(!ok)throw new Error('invalid_content_id');
    const key=type+':'+id;
    if(seen.has(key))continue;
    seen.add(key);out.push({content_type:type,content_id:id});
  }
  return out;
}
function rowToItem(row){
  return {
    content_type:String(row.content_type),
    content_id:String(row.content_id),
    area:String(row.area||''),
    stage_or_role:String(row.stage_or_role||''),
    text:String(row.text||''),
    exposure:row.exposure==null?null:String(row.exposure),
    source_ocean_id:row.source_ocean_id==null?null:String(row.source_ocean_id),
    source_kind:row.source_kind==null?'':String(row.source_kind),
    quality_version:row.quality_version==null?'':String(row.quality_version),
    status:String(row.status||''),
    lifecycle_state:String(row.lifecycle_state||''),
    rotation_state:String(row.rotation_state||''),
    created_at:String(row.created_at||'')
  };
}

function normalizeAuditState(value){
  const state=String(value||'candidate').trim();
  if(!['candidate','review','candidate-review','live','retired','all'].includes(state))throw new Error('invalid_audit_state');
  return state;
}
function auditStateWhere(state){
  if(state==='candidate')return "status='candidate' AND lifecycle_state='candidate'";
  if(state==='review')return "status='review' AND lifecycle_state='review'";
  if(state==='candidate-review')return "status IN ('candidate','review') AND lifecycle_state IN ('candidate','review')";
  if(state==='live')return "status IN ('active','approved') AND lifecycle_state='live'";
  if(state==='retired')return "status='retired' OR lifecycle_state='retired'";
  return '1=1';
}

export async function listEditorialAuditContent(db,{type='all',state='candidate',limit=100,offset=0}={}){
  const safeType=normalizeType(type);
  const safeState=normalizeAuditState(state);
  const safeLimit=Math.max(1,Math.min(100,Math.floor(Number(limit)||100)));
  const safeOffset=Math.max(0,Math.min(20000,Math.floor(Number(offset)||0)));
  const filter=auditStateWhere(safeState);
  const selects=[];
  if(safeType!=='oracle_block'){
    selects.push(`SELECT 'question' AS content_type,question_id AS content_id,theme AS area,stage AS stage_or_role,
      text,exposure,source_ocean_id,source_kind,quality_version,status,lifecycle_state,rotation_state,created_at
      FROM vault_questions WHERE (${filter})`);
  }
  if(safeType!=='question'){
    selects.push(`SELECT 'oracle_block' AS content_type,block_id AS content_id,territory AS area,role AS stage_or_role,
      text,NULL AS exposure,source_ocean_id,source_kind,quality_version,status,lifecycle_state,rotation_state,created_at
      FROM vault_oracle_blocks WHERE (${filter})`);
  }
  const union=selects.join(' UNION ALL ');
  const totalRow=await db.prepare(`SELECT COUNT(*) AS total FROM (${union}) AS editorial_audit`).first();
  const result=await db.prepare(`SELECT * FROM (${union}) AS editorial_audit
    ORDER BY created_at DESC,content_id ASC LIMIT ?1 OFFSET ?2`).bind(safeLimit,safeOffset).all();
  const total=Number(totalRow?.total||0);
  return {
    ok:true,type:safeType,state:safeState,
    limit:safeLimit,offset:safeOffset,total,
    hasMore:safeOffset+((result.results||[]).length)<total,
    items:(result.results||[]).map(rowToItem)
  };
}

export async function retireEditorialContent(db,{items,reason='Retirado após auditoria editorial'}={}){
  const normalized=normalizeItems(items);
  const editorialReason=String(reason||'Retirado após auditoria editorial').replace(/\s+/g,' ').trim().slice(0,1000)||'Retirado após auditoria editorial';
  const eligible=[];
  for(const item of normalized){
    const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
    const idCol=item.content_type==='question'?'question_id':'block_id';
    const row=await db.prepare(`SELECT ${idCol} AS id,status,lifecycle_state FROM ${table} WHERE ${idCol}=?1 LIMIT 1`).bind(item.content_id).first();
    if(!row)continue;
    if(String(row.status)==='retired'&&String(row.lifecycle_state)==='retired')continue;
    eligible.push(item);
  }
  for(let i=0;i<eligible.length;i+=50){
    const statements=[];
    for(const item of eligible.slice(i,i+50)){
      const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
      const idCol=item.content_type==='question'?'question_id':'block_id';
      statements.push(db.prepare(`UPDATE ${table}
        SET status='retired',lifecycle_state='retired',rotation_state='retired'
        WHERE ${idCol}=?1 AND NOT(status='retired' AND lifecycle_state='retired')`).bind(item.content_id));
      statements.push(db.prepare(`INSERT INTO vault_editorial_decisions
        (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
        VALUES(?1,?2,?3,'retire','human_editorial_audit_retirement',?4,'vault-content-audit-v1')`).bind(
          'dec_'+crypto.randomUUID(),item.content_type,item.content_id,
          JSON.stringify({source:'editorial_vault_audit',action:'retire_preserving_history',reason:editorialReason})
        ));
    }
    if(statements.length)await db.batch(statements);
  }
  return {
    ok:true,requested:normalized.length,retired:eligible.length,reason:editorialReason,
    retiredItems:eligible,physicalDeletion:false,
    note:'Conteúdo retirado da selecção futura; o registo e a decisão editorial foram preservados.'
  };
}
export async function quarantineOceanEditorialContent(db,{
  items,
  reason='Conteúdo suspenso até revisão editorial',
  sourceKind='ocean_mcp_candidate',
  qualityVersion=''
}={}){
  const normalized=normalizeItems(items);
  const requestedSource=String(sourceKind||'ocean_mcp_candidate').trim();
  const requestedVersion=String(qualityVersion||'').trim();
  const allowedOcean=requestedSource==='ocean_mcp_candidate'&&!requestedVersion;
  const allowedAmor001=requestedSource==='maison_private_import'&&requestedVersion==='private-import:amor-001:v1';
  if(!allowedOcean&&!allowedAmor001)throw new Error('invalid_quarantine_scope');
  const editorialReason=String(reason||'Conteúdo suspenso até revisão editorial').replace(/\s+/g,' ').trim().slice(0,1000)||'Conteúdo suspenso até revisão editorial';
  const eligible=[];
  for(const item of normalized){
    const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
    const idCol=item.content_type==='question'?'question_id':'block_id';
    const row=await db.prepare(`SELECT ${idCol} AS id,source_kind,quality_version,status,lifecycle_state
      FROM ${table} WHERE ${idCol}=?1 LIMIT 1`).bind(item.content_id).first();
    if(!row)continue;
    if(String(row.source_kind)!==requestedSource)continue;
    if(requestedVersion&&String(row.quality_version)!==requestedVersion)continue;
    if(String(row.status)!=='active'||String(row.lifecycle_state)!=='live')continue;
    eligible.push(item);
  }
  for(let i=0;i<eligible.length;i+=50){
    const statements=[];
    for(const item of eligible.slice(i,i+50)){
      const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
      const idCol=item.content_type==='question'?'question_id':'block_id';
      const versionClause=requestedVersion?'AND quality_version=?3':'';
      const bindings=requestedVersion?[item.content_id,requestedSource,requestedVersion]:[item.content_id,requestedSource];
      statements.push(db.prepare(`UPDATE ${table}
        SET status='review',lifecycle_state='review',rotation_state='review'
        WHERE ${idCol}=?1 AND source_kind=?2 ${versionClause}
          AND status='active' AND lifecycle_state='live'`).bind(...bindings));
      statements.push(db.prepare(`INSERT INTO vault_editorial_decisions
        (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
        VALUES(?1,?2,?3,'review',?4,?5,'vault-content-audit-v1')`).bind(
          'dec_'+crypto.randomUUID(),item.content_type,item.content_id,
          allowedAmor001?'import_batch_quarantine':'ocean_candidate_quarantine',
          JSON.stringify({source:'editorial_vault_audit',action:'quarantine_until_human_review',reason:editorialReason,source_kind:requestedSource,quality_version:requestedVersion||null})
        ));
    }
    if(statements.length)await db.batch(statements);
  }
  return {
    ok:true,requested:normalized.length,quarantined:eligible.length,reason:editorialReason,
    sourceKind:requestedSource,qualityVersion:requestedVersion||null,
    quarantinedItems:eligible,physicalDeletion:false,
    note:'Registos movidos para revisão; texto e histórico preservados. Só podem ser reativados após aprovação editorial.'
  };
}

function whereForState(state){
  if(state==='candidate')return "status='candidate' AND lifecycle_state='candidate'";
  if(state==='review')return "status='review' AND lifecycle_state='review'";
  return "status IN ('candidate','review') AND lifecycle_state IN ('candidate','review')";
}
function sourceWhere(){
  return "source_kind IN ('ocean_mcp_candidate','ocean_seed_candidate')";
}
async function listQuestions(db,state,limit){
  const result=await db.prepare(
    `SELECT 'question' AS content_type,question_id AS content_id,theme AS area,stage AS stage_or_role,
            text,exposure,source_ocean_id,status,lifecycle_state,rotation_state,created_at
       FROM vault_questions
      WHERE ${sourceWhere()} AND ${whereForState(state)}
      ORDER BY created_at DESC
      LIMIT ?1`
  ).bind(limit).all();
  return (result.results||[]).map(rowToItem);
}
async function listOracle(db,state,limit){
  const result=await db.prepare(
    `SELECT 'oracle_block' AS content_type,block_id AS content_id,territory AS area,role AS stage_or_role,
            text,NULL AS exposure,source_ocean_id,status,lifecycle_state,rotation_state,created_at
       FROM vault_oracle_blocks
      WHERE ${sourceWhere()} AND ${whereForState(state)}
      ORDER BY created_at DESC
      LIMIT ?1`
  ).bind(limit).all();
  return (result.results||[]).map(rowToItem);
}

export async function vaultCandidateStats(db){
  const row=await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM vault_questions) AS all_questions,
      (SELECT COUNT(*) FROM vault_oracle_blocks) AS all_oracle_blocks,
      (SELECT COUNT(*) FROM vault_questions
        WHERE source_kind IN ('ocean_mcp_candidate','ocean_seed_candidate')
          AND status='candidate' AND lifecycle_state='candidate') AS question_candidates,
      (SELECT COUNT(*) FROM vault_oracle_blocks
        WHERE source_kind IN ('ocean_mcp_candidate','ocean_seed_candidate')
          AND status='candidate' AND lifecycle_state='candidate') AS oracle_candidates,
      (SELECT COUNT(*) FROM vault_questions
        WHERE status='review' AND lifecycle_state='review') AS question_review,
      (SELECT COUNT(*) FROM vault_oracle_blocks
        WHERE status='review' AND lifecycle_state='review') AS oracle_review,
      (SELECT COUNT(*) FROM vault_questions
        WHERE status='active' AND lifecycle_state='live') AS question_live,
      (SELECT COUNT(*) FROM vault_oracle_blocks
        WHERE status='active' AND lifecycle_state='live') AS oracle_live
  `).first();
  const out={};
  for(const [key,value] of Object.entries(row||{}))out[key]=Number(value||0);
  out.total=(out.all_questions||0)+(out.all_oracle_blocks||0);
  out.candidates=(out.question_candidates||0)+(out.oracle_candidates||0);
  out.review=(out.question_review||0)+(out.oracle_review||0);
  out.live=(out.question_live||0)+(out.oracle_live||0);
  return {ok:true,...out};
}

export async function listOceanVaultCandidates(db,{type='all',state='candidate',limit=100}={}){
  const safeType=normalizeType(type);
  const safeState=normalizeState(state);
  const safeLimit=clampLimit(limit);
  const rows=[];
  if(safeType!=='oracle_block')rows.push(...await listQuestions(db,safeState,safeLimit));
  if(safeType!=='question')rows.push(...await listOracle(db,safeState,safeLimit));
  rows.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  return {ok:true,type:safeType,state:safeState,total:rows.length,items:rows.slice(0,safeLimit)};
}

async function selectAllEligible(db,type){
  const rows=[];
  if(type!=='oracle_block'){
    const q=await db.prepare(
      `SELECT 'question' AS content_type,question_id AS content_id
         FROM vault_questions
        WHERE ${sourceWhere()}
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        ORDER BY created_at ASC
        LIMIT ?1`
    ).bind(MAX_ACTION).all();
    rows.push(...(q.results||[]));
  }
  if(type!=='question'&&rows.length<MAX_ACTION){
    const remaining=MAX_ACTION-rows.length;
    const o=await db.prepare(
      `SELECT 'oracle_block' AS content_type,block_id AS content_id
         FROM vault_oracle_blocks
        WHERE ${sourceWhere()}
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        ORDER BY created_at ASC
        LIMIT ?1`
    ).bind(remaining).all();
    rows.push(...(o.results||[]));
  }
  return rows.map(x=>({content_type:String(x.content_type),content_id:String(x.content_id)}));
}

async function currentEligible(db,item){
  if(item.content_type==='question'){
    return await db.prepare(
      `SELECT question_id AS id FROM vault_questions
        WHERE question_id=?1 AND ${sourceWhere()}
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        LIMIT 1`
    ).bind(item.content_id).first();
  }
  return await db.prepare(
    `SELECT block_id AS id FROM vault_oracle_blocks
      WHERE block_id=?1 AND ${sourceWhere()}
        AND status IN ('candidate','review')
        AND lifecycle_state IN ('candidate','review')
      LIMIT 1`
  ).bind(item.content_id).first();
}

function updateStatement(db,item,mode){
  const live=mode==='activate';
  const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
  const idCol=item.content_type==='question'?'question_id':'block_id';
  return db.prepare(
    `UPDATE ${table}
        SET status=?1,lifecycle_state=?2,rotation_state=?3
      WHERE ${idCol}=?4 AND ${sourceWhere()}
        AND status IN ('candidate','review')
        AND lifecycle_state IN ('candidate','review')`
  ).bind(
    live?'active':'review',
    live?'live':'review',
    live?'new':'review',
    item.content_id
  );
}
function decisionStatement(db,item,mode){
  return db.prepare(
    `INSERT INTO vault_editorial_decisions
      (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
     VALUES(?1,?2,?3,?4,?5,?6,'vault-quick-review-v1')`
  ).bind(
    'dec_'+crypto.randomUUID(),
    item.content_type,item.content_id,
    mode==='activate'?'activate':'review',
    mode==='activate'?'human_quick_approval':'human_hold_for_review',
    JSON.stringify({source:'editorial_vault'})
  );
}
async function apply(db,rawItems,mode){
  const items=normalizeItems(rawItems);
  const eligible=[];
  for(const item of items){
    if(await currentEligible(db,item))eligible.push(item);
  }
  for(let i=0;i<eligible.length;i+=50){
    const statements=[];
    for(const item of eligible.slice(i,i+50)){
      statements.push(updateStatement(db,item,mode),decisionStatement(db,item,mode));
    }
    if(statements.length)await db.batch(statements);
  }
  return {ok:true,requested:items.length,changed:eligible.length,mode};
}

export async function seedOceanVaultCandidates(){
  return {
    ok:true,disabled:true,questions:0,oracle_blocks:0,created:0,skipped:0,
    source:'existing_oceans',
    reason:'generic_ocean_seed_disabled',
    message:'A criação automática de perguntas e afirmações genéricas foi desativada. Os sinais dos Oceans devem passar por classificação editorial e só gerar conteúdo quando houver adequação real.'
  };
}

export async function activateOceanVaultCandidates(db,{items,all=false,type='all'}={}){
  const safeType=normalizeType(type);
  const selected=all?await selectAllEligible(db,safeType):items;
  return await apply(db,selected,'activate');
}
export async function reviewOceanVaultCandidates(db,{items}={}){
  return await apply(db,items,'review');
}
