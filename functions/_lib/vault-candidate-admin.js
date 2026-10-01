import { VPC_OCEAN_SIGNALS } from './vpc-ocean-signals.generated.js';

const SOURCE_KINDS=['ocean_mcp_candidate','ocean_seed_candidate'];
const MAX_LIST=500;
const MAX_ACTION=1000;
const ORACLE_IDS=new Set(["adiar-o-sono-para-recuperar-autonomia","ansiedade-antecipatoria-na-transicao-domingo-semana","atencao-fragmentada-por-interrupcoes-digitais","auto-silenciamento-para-preservar-o-vinculo","autonomia-condicionada-pelo-medo-da-reaccao","carga-mental-invisivel-da-casa","cuidar-sem-desaparecer-no-papel-de-cuidador","culpa-ao-descansar-como-se-o-descanso-tivesse-de-ser-merecido","doomscrolling-para-tentar-reduzir-incerteza","evitamento-financeiro-sob-escassez","ficar-em-suspenso-enquanto-se-espera-uma-resposta-importante","luto-por-um-futuro-que-deixou-de-ser-possivel","micro-luxo-como-recompensa-e-ritual","perda-ambigua-sem-fecho-claro","precisar-de-solidao-para-recuperar-energia-social","presenca-que-ampara-sem-tentar-resolver","pressao-social-para-gastar-e-vergonha-de-dizer-nao","quando-o-que-funciona-na-relacao-se-torna-invisivel","rituais-sensoriais-com-plantas-como-marcadores-de-transicao","sobrecarga-de-escolha-quando-mais-opcoes-paralisam","solidao-com-contacto-sem-conexao-de-qualidade","telepressao-e-disponibilidade-permanente"]);

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

async function sha40(value){
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim())));
  return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,40);
}
function seedQuestionText(theme,variant){
  const t=String(theme||'o que está a acontecer').trim();
  if(variant===1)return `Quando aparece a sensação de «${t}», o que costumas fazer primeiro — aproximar-te do que precisas ou afastar-te disso?`;
  return `Se «${t}» não precisasse de ser resolvido já, o que gostarias de perceber melhor sobre ti nessa situação?`;
}
function seedOracleText(signal){
  const pain=String(signal?.painLanguage||'').trim();
  return `${pain} Antes de tentares resolver isto, repara no que estás a proteger, no que estás a adiar e no que já sabes mas tens evitado nomear. O movimento não é forçar uma resposta; é tornar mais claro o lugar de onde estás a escolher.`;
}
async function existsByIdOrFingerprint(db,table,idColumn,id,fp){
  return await db.prepare(
    `SELECT ${idColumn} AS id FROM ${table} WHERE ${idColumn}=?1 OR semantic_fingerprint=?2 LIMIT 1`
  ).bind(id,fp).first();
}
async function seedQuestion(db,signal,variant){
  const ocean=String(signal.id);
  const theme=String(signal.themes?.[variant-1]||signal.themes?.[0]||ocean).slice(0,120);
  const text=seedQuestionText(theme,variant);
  const fp=await sha40(text);
  const id='q_seed_'+ocean+'_'+variant;
  if(await existsByIdOrFingerprint(db,'vault_questions','question_id',id,fp))return false;
  const stage=variant===1?'recognize':'deepen';
  const insert=db.prepare(
    `INSERT INTO vault_questions
      (question_id,canonical_key,theme,text,subthemes_json,class,stage,intensity,direction,time_scope,
       exposure,status,scores_json,viral_json,conflicts_json,pairs_json,similarity_group,source_kind,
       pain_family,subterritory,target,emotional_function,cognitive_load,vulnerability,conflict_potential,
       playfulness,semantic_fingerprint,compatibility_json,product_fit_json,lifecycle_state,rotation_state,
       source_ocean_id,quality_version)
     VALUES(?1,?2,?3,?4,?5,'mirror',?6,2,'either','timeless','paid','candidate',?7,'{}','[]','[]',?8,
            'ocean_seed_candidate',?9,?10,'both','discovery',2,2,2,2,?11,'{}',?12,'candidate','new',?13,'ocean-seed-v1')`
  ).bind(
    id,'seed:'+ocean+':q'+variant,theme,text,JSON.stringify((signal.themes||[]).slice(0,8)),stage,
    JSON.stringify({clarity:4,conversationValue:4,safety:5,editorialQuality:3,humanity:4,composability:4}),
    ocean,theme,theme,fp,JSON.stringify({para_de_ignorar:1,source:'ocean_seed'}),ocean
  );
  const decision=db.prepare(
    `INSERT INTO vault_editorial_decisions
      (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
     VALUES(?1,'question',?2,'propose','ocean_seed_candidate',?3,'ocean-seed-v1')`
  ).bind('dec_'+crypto.randomUUID(),id,JSON.stringify({source_ocean_id:ocean,seed:true}));
  await db.batch([insert,decision]);
  return true;
}
async function seedOracle(db,signal,index){
  const ocean=String(signal.id);
  const text=seedOracleText(signal);
  const fp=await sha40(text);
  const id='ob_seed_'+ocean;
  if(await existsByIdOrFingerprint(db,'vault_oracle_blocks','block_id',id,fp))return false;
  const role=index%2===0?'recognition':'reframe';
  const title=String(signal.themes?.[0]||ocean).slice(0,180);
  const insert=db.prepare(
    `INSERT INTO vault_oracle_blocks
      (block_id,canonical_key,territory,role,intensity,text,status,compatibility_json,scores_json,source_kind,
       title,pain_family,subterritory,tone,emotional_function,semantic_fingerprint,tags_json,product_fit_json,
       lifecycle_state,rotation_state,rarity,source_ocean_id,quality_version)
     VALUES(?1,?2,?3,?4,2,?5,'candidate','{}',?6,'ocean_seed_candidate',?7,?8,?9,'intimate','recognition',
            ?10,?11,?12,'candidate','new','common',?13,'ocean-seed-v1')`
  ).bind(
    id,'seed:'+ocean+':oracle',ocean,role,text,
    JSON.stringify({clarity:4,safety:5,editorialQuality:3,humanity:4,composability:4}),
    title,ocean,title,fp,JSON.stringify((signal.themes||[]).slice(0,12)),
    JSON.stringify({oracle:1,source:'ocean_seed'}),ocean
  );
  const decision=db.prepare(
    `INSERT INTO vault_editorial_decisions
      (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
     VALUES(?1,'oracle_block',?2,'propose','ocean_seed_candidate',?3,'ocean-seed-v1')`
  ).bind('dec_'+crypto.randomUUID(),id,JSON.stringify({source_ocean_id:ocean,seed:true}));
  await db.batch([insert,decision]);
  return true;
}

export async function seedOceanVaultCandidates(db){
  let questions=0,oracleBlocks=0,skipped=0;
  for(let i=0;i<VPC_OCEAN_SIGNALS.length;i++){
    const signal=VPC_OCEAN_SIGNALS[i];
    for(const variant of [1,2]){
      if(await seedQuestion(db,signal,variant))questions++; else skipped++;
    }
    if(ORACLE_IDS.has(String(signal.id))){
      if(await seedOracle(db,signal,i))oracleBlocks++; else skipped++;
    }
  }
  return {ok:true,questions,oracle_blocks:oracleBlocks,created:questions+oracleBlocks,skipped,source:'existing_oceans'};
}

export async function activateOceanVaultCandidates(db,{items,all=false,type='all'}={}){
  const safeType=normalizeType(type);
  const selected=all?await selectAllEligible(db,safeType):items;
  return await apply(db,selected,'activate');
}
export async function reviewOceanVaultCandidates(db,{items}={}){
  return await apply(db,items,'review');
}
