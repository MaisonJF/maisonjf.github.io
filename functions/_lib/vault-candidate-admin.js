const SOURCE_KIND='ocean_mcp_candidate';
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
    status:String(row.status||''),
    lifecycle_state:String(row.lifecycle_state||''),
    rotation_state:String(row.rotation_state||''),
    created_at:String(row.created_at||'')
  };
}
function whereForState(state){
  if(state==='candidate')return "status='candidate' AND lifecycle_state='candidate'";
  if(state==='review')return "status='review' AND lifecycle_state='review'";
  return "status IN ('candidate','review') AND lifecycle_state IN ('candidate','review')";
}
async function listQuestions(db,state,limit){
  const result=await db.prepare(
    `SELECT 'question' AS content_type,question_id AS content_id,theme AS area,stage AS stage_or_role,
            text,exposure,source_ocean_id,status,lifecycle_state,rotation_state,created_at
       FROM vault_questions
      WHERE source_kind=?1 AND ${whereForState(state)}
      ORDER BY created_at DESC
      LIMIT ?2`
  ).bind(SOURCE_KIND,limit).all();
  return (result.results||[]).map(rowToItem);
}
async function listOracle(db,state,limit){
  const result=await db.prepare(
    `SELECT 'oracle_block' AS content_type,block_id AS content_id,territory AS area,role AS stage_or_role,
            text,NULL AS exposure,source_ocean_id,status,lifecycle_state,rotation_state,created_at
       FROM vault_oracle_blocks
      WHERE source_kind=?1 AND ${whereForState(state)}
      ORDER BY created_at DESC
      LIMIT ?2`
  ).bind(SOURCE_KIND,limit).all();
  return (result.results||[]).map(rowToItem);
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
        WHERE source_kind=?1
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        ORDER BY created_at ASC
        LIMIT ?2`
    ).bind(SOURCE_KIND,MAX_ACTION).all();
    rows.push(...(q.results||[]));
  }
  if(type!=='question'&&rows.length<MAX_ACTION){
    const remaining=MAX_ACTION-rows.length;
    const o=await db.prepare(
      `SELECT 'oracle_block' AS content_type,block_id AS content_id
         FROM vault_oracle_blocks
        WHERE source_kind=?1
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        ORDER BY created_at ASC
        LIMIT ?2`
    ).bind(SOURCE_KIND,remaining).all();
    rows.push(...(o.results||[]));
  }
  return rows.map(x=>({content_type:String(x.content_type),content_id:String(x.content_id)}));
}

async function currentEligible(db,item){
  if(item.content_type==='question'){
    return await db.prepare(
      `SELECT question_id AS id FROM vault_questions
        WHERE question_id=?1 AND source_kind=?2
          AND status IN ('candidate','review')
          AND lifecycle_state IN ('candidate','review')
        LIMIT 1`
    ).bind(item.content_id,SOURCE_KIND).first();
  }
  return await db.prepare(
    `SELECT block_id AS id FROM vault_oracle_blocks
      WHERE block_id=?1 AND source_kind=?2
        AND status IN ('candidate','review')
        AND lifecycle_state IN ('candidate','review')
      LIMIT 1`
  ).bind(item.content_id,SOURCE_KIND).first();
}

function updateStatement(db,item,mode){
  const live=mode==='activate';
  const table=item.content_type==='question'?'vault_questions':'vault_oracle_blocks';
  const idCol=item.content_type==='question'?'question_id':'block_id';
  return db.prepare(
    `UPDATE ${table}
        SET status=?1,lifecycle_state=?2,rotation_state=?3
      WHERE ${idCol}=?4 AND source_kind=?5
        AND status IN ('candidate','review')
        AND lifecycle_state IN ('candidate','review')`
  ).bind(
    live?'active':'review',
    live?'live':'review',
    live?'new':'review',
    item.content_id,SOURCE_KIND
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
    JSON.stringify({source_kind:SOURCE_KIND})
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

export async function activateOceanVaultCandidates(db,{items,all=false,type='all'}={}){
  const safeType=normalizeType(type);
  const selected=all?await selectAllEligible(db,safeType):items;
  return await apply(db,selected,'activate');
}
export async function reviewOceanVaultCandidates(db,{items}={}){
  return await apply(db,items,'review');
}
