import { validateQuestionCard } from './maison-content-ontology.js';
import { getPdiTheme } from './pdi-theme-registry.js';

const MAX_IMPORT=100;
const SOURCE_KIND='maison_private_import';

export async function importPrivateQuestionBatch(db,{batchId,questions=[]}={}){
  const safeBatch=normalizeBatchId(batchId);
  if(!safeBatch)throw new Error('batch_id_required');
  if(!Array.isArray(questions)||questions.length<1)throw new Error('questions_required');
  if(questions.length>MAX_IMPORT)throw new Error('batch_too_large');

  const normalized=[];
  const errors=[];
  const localIds=new Set();
  for(let i=0;i<questions.length;i++){
    try{
      const q=await normalizeQuestion(questions[i],safeBatch);
      if(localIds.has(q.id))throw new Error('duplicate_id_in_request');
      localIds.add(q.id);
      normalized.push(q);
    }catch(error){
      errors.push({index:i,code:String(error?.message||'invalid_question')});
    }
  }
  if(errors.length)return {ok:false,batchId:safeBatch,accepted:0,skipped:0,errors};

  const inserts=[];
  let skipped=0;
  for(const q of normalized){
    const duplicate=await db.prepare(
      `SELECT question_id FROM vault_questions
        WHERE question_id=?1
           OR (theme=?2 AND semantic_fingerprint=?3)
        LIMIT 1`
    ).bind(q.id,q.theme,q.semanticFingerprint).first();
    if(duplicate){ skipped++; continue; }

    inserts.push(db.prepare(
      `INSERT INTO vault_questions
       (question_id,canonical_key,theme,text,subthemes_json,class,stage,intensity,
        direction,time_scope,exposure,status,scores_json,viral_json,conflicts_json,
        pairs_json,similarity_group,source_kind,pain_family,subterritory,target,
        emotional_function,cognitive_load,vulnerability,conflict_potential,playfulness,
        semantic_fingerprint,compatibility_json,product_fit_json,lifecycle_state,
        rotation_state,source_ocean_id,quality_version)
       VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'paid','candidate',?11,'{}','[]','[]',
              ?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,'{}',?24,
              'candidate','new',?25,?26)`
    ).bind(
      q.id,q.canonicalKey,q.theme,q.text,JSON.stringify(q.subthemes),q.class,q.stage,q.intensity,
      q.direction,q.time,JSON.stringify(q.scores),q.similarityGroup,SOURCE_KIND,q.painFamily,
      q.subterritory,q.target,q.emotionalFunction,q.cognitiveLoad,q.vulnerability,
      q.conflictPotential,q.playfulness,q.semanticFingerprint,JSON.stringify(q.productFit),
      q.sourceOceanId,q.qualityVersion
    ));
  }
  if(inserts.length)await db.batch(inserts);
  return {ok:true,batchId:safeBatch,accepted:inserts.length,skipped,errors:[]};
}

export async function inspectPrivateQuestionBatch(db,{batchId}={}){
  const safeBatch=normalizeBatchId(batchId);
  if(!safeBatch)throw new Error('batch_id_required');
  const qualityVersion=qualityVersionFor(safeBatch);
  const rows=await db.prepare(
    `SELECT theme,stage,status,lifecycle_state,COUNT(*) AS count
       FROM vault_questions
      WHERE source_kind=?1 AND quality_version=?2
      GROUP BY theme,stage,status,lifecycle_state
      ORDER BY theme,stage,status,lifecycle_state`
  ).bind(SOURCE_KIND,qualityVersion).all();
  const groups=(rows.results||[]).map(row=>({
    theme:String(row.theme),
    stage:String(row.stage),
    status:String(row.status),
    lifecycleState:String(row.lifecycle_state),
    count:Number(row.count||0)
  }));
  return {
    batchId:safeBatch,
    total:groups.reduce((n,x)=>n+x.count,0),
    groups
  };
}

export async function activatePrivateQuestionBatch(db,{batchId}={}){
  const safeBatch=normalizeBatchId(batchId);
  if(!safeBatch)throw new Error('batch_id_required');
  const qualityVersion=qualityVersionFor(safeBatch);
  const before=await db.prepare(
    `SELECT question_id,theme
       FROM vault_questions
      WHERE source_kind=?1
        AND quality_version=?2
        AND exposure='paid'
        AND status IN ('candidate','approved')
        AND lifecycle_state IN ('candidate','vault')`
  ).bind(SOURCE_KIND,qualityVersion).all();
  const rows=before.results||[];
  if(!rows.length)return {batchId:safeBatch,activated:0,themes:[]};

  await db.prepare(
    `UPDATE vault_questions
        SET status='active',lifecycle_state='live',rotation_state='new'
      WHERE source_kind=?1
        AND quality_version=?2
        AND exposure='paid'
        AND status IN ('candidate','approved')
        AND lifecycle_state IN ('candidate','vault')`
  ).bind(SOURCE_KIND,qualityVersion).run();

  const decisions=rows.map(row=>db.prepare(
    `INSERT INTO vault_editorial_decisions
     (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
     VALUES(?1,'question',?2,'activate','human_admin_batch_activation',?3,'pdi-admin-import-v1')`
  ).bind(
    'dec_'+safeBatch+'_'+String(row.question_id).replace(/[^a-zA-Z0-9_-]+/g,'_'),
    row.question_id,
    JSON.stringify({batchId:safeBatch})
  ));
  if(decisions.length)await db.batch(decisions);

  return {
    batchId:safeBatch,
    activated:rows.length,
    themes:[...new Set(rows.map(x=>String(x.theme)))]
  };
}

export function normalizeBatchId(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,80);
}

function qualityVersionFor(batchId){
  return 'private-import:'+batchId+':v1';
}

async function normalizeQuestion(input,batchId){
  if(!input||typeof input!=='object')throw new Error('question_object_required');
  const theme=String(input.theme||'').trim();
  if(!getPdiTheme(theme))throw new Error('unknown_theme');
  const text=String(input.text||'').trim();
  if(text.length<8||text.length>500)throw new Error('invalid_text_length');

  const id=String(input.id||'').trim();
  if(!/^q_[a-z0-9_-]+$/i.test(id))throw new Error('invalid_id');
  const subthemes=Array.isArray(input.subthemes)?input.subthemes.filter(Boolean).map(String).slice(0,12):[];
  const subterritory=String(input.subterritory||subthemes[0]||theme).slice(0,120);
  const card={
    id,theme,text,
    class:String(input.class||'mirror'),
    stage:String(input.stage||'open'),
    intensity:Number(input.intensity||1),
    direction:String(input.direction||'either'),
    time:String(input.time||input.time_scope||'timeless'),
    exposure:'paid',
    status:'candidate',
    target:String(input.target||'both'),
    emotionalFunction:String(input.emotionalFunction||input.emotional_function||'discovery'),
    lifecycleState:'candidate',
    rotationState:'new',
    cognitiveLoad:Number(input.cognitiveLoad||input.cognitive_load||2),
    vulnerability:Number(input.vulnerability||2),
    conflictPotential:Number(input.conflictPotential||input.conflict_potential||2),
    playfulness:Number(input.playfulness||2),
    scores:cleanScores(input.scores)
  };
  const check=validateQuestionCard(card);
  if(!check.ok)throw new Error('ontology:'+check.errors.join(','));

  return {
    ...card,
    canonicalKey:String(input.canonicalKey||input.canonical_key||id.replace(/^q_/,'')).slice(0,160),
    subthemes,
    subterritory,
    painFamily:String(input.painFamily||input.pain_family||theme).slice(0,120),
    similarityGroup:String(input.similarityGroup||input.similarity_group||subterritory).slice(0,120),
    semanticFingerprint:await fingerprint(text),
    productFit:{para_de_ignorar:1},
    sourceOceanId:input.sourceOceanId?String(input.sourceOceanId).slice(0,120):null,
    qualityVersion:qualityVersionFor(batchId)
  };
}

function cleanScores(value){
  const allowed=['kiss','hormozi','barnum','feral','viral','conversationValue','clarity','originality','safety','editorialQuality','humanity','specificity','emotionalTruth','composability'];
  const out={};
  if(value&&typeof value==='object'){
    for(const key of allowed){
      const n=Number(value[key]);
      if(Number.isFinite(n)&&n>=0&&n<=5)out[key]=n;
    }
  }
  if(!Object.keys(out).length){
    Object.assign(out,{clarity:4,conversationValue:4,safety:5,editorialQuality:4,humanity:4,composability:4});
  }
  return out;
}

async function fingerprint(text){
  const normalized=String(text).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized)));
  return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40);
}
