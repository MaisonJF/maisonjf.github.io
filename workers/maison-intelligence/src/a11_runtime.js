const ID_RE=/^[a-z]{3}_[0-9a-f]{36}$/;
const HEX64=/^[0-9a-f]{64}$/;
const ALLOWED_SIGNALS=new Set(['positive','negative','neutral','insufficient']);

export class A11RuntimeError extends Error {
  constructor(code,status=400){
    super(code);
    this.code=code;
    this.status=status;
  }
}

function enabled(v){return String(v??'').toLowerCase()==='true';}
function tokenFrom(request){
  const raw=request.headers.get('Authorization')||'';
  return raw.startsWith('Bearer ')?raw.slice(7).trim():'';
}
function constantTimeEqual(left,right){
  const a=String(left??''),b=String(right??'');
  let diff=a.length^b.length;
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++)diff|=(a.charCodeAt(i%Math.max(a.length,1))||0)^(b.charCodeAt(i%Math.max(b.length,1))||0);
  return diff===0;
}
function json(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'Pragma':'no-cache',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer'
    }
  });
}
function stableJson(value){
  if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
  }
  return JSON.stringify(value);
}
async function sha256(text){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function stableId(prefix,payload){
  return prefix+(await sha256(stableJson(payload))).slice(0,36);
}
function requireId(value,prefix){
  if(typeof value!=='string'||value.length!==40||!value.startsWith(prefix)||!ID_RE.test(value)){
    throw new A11RuntimeError('invalid_'+prefix.slice(0,3)+'_id');
  }
  return value;
}
function requireJsonObject(value,code){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new A11RuntimeError(code);
  return value;
}
function stringArray(value,code){
  if(!Array.isArray(value)||value.some(x=>typeof x!=='string'||x.length<1||x.length>300)){
    throw new A11RuntimeError(code);
  }
  return [...new Set(value)];
}
function actionFor(signal){
  return {
    positive:'increase_confidence',
    negative:'decrease_confidence',
    neutral:'hold_confidence',
    insufficient:'observe'
  }[signal];
}

async function canonicalRule(db){
  const state=await db.prepare(
    "SELECT schema_value FROM schema_state WHERE schema_key='maison_growth_a11_rule_version' LIMIT 1"
  ).first();
  if(!state?.schema_value)throw new A11RuntimeError('a11_rule_not_seeded',503);
  const rule=await db.prepare(
    "SELECT rule_version_id,version_label,definition_hash,definition_json FROM rule_versions WHERE rule_version_id=?1 AND family='learning' LIMIT 1"
  ).bind(state.schema_value).first();
  if(!rule)throw new A11RuntimeError('a11_rule_not_seeded',503);
  let policy;
  try{policy=JSON.parse(rule.definition_json);}catch{throw new A11RuntimeError('a11_rule_invalid',503);}
  if(policy?.mode!=='analysis_only'||policy?.policy_version!=='A11.2'){
    throw new A11RuntimeError('a11_rule_invalid',503);
  }
  return {rule,policy};
}

async function contentEvent(db,eventId){
  return await db.prepare(`
    SELECT event_id,payload_hash,occurred_at,privacy_class,metadata_json
    FROM events
    WHERE event_id=?1
      AND source='maison-content-distribution'
      AND event_type='content.performance_observed'
    LIMIT 1
  `).bind(eventId).first();
}

export async function appendContentLearning(db,input){
  if(!db||typeof db.prepare!=='function')throw new A11RuntimeError('a11_database_unavailable',503);
  const body=requireJsonObject(input,'invalid_learning_payload');
  const sourceEventId=requireId(body.source_event_id,'evt_');
  const record=requireJsonObject(body.record,'invalid_learning_record');
  const learningRecordId=requireId(record.learning_record_id,'lrn_');
  const sourceId=requireId(record.source_id,'cnt_');
  const subjectId=requireId(record.subject_id,'can_');
  const inputHash=String(record.input_hash||'').toLowerCase();
  if(!HEX64.test(inputHash))throw new A11RuntimeError('invalid_learning_input_hash');
  if(!ALLOWED_SIGNALS.has(record.signal_class))throw new A11RuntimeError('invalid_learning_signal');
  const evidenceRefs=stringArray(record.evidence_refs||[],'invalid_learning_evidence');
  const reasonCodes=stringArray(record.reason_codes||[],'invalid_learning_reasons');
  const expected=requireJsonObject(record.expected_json||{},'invalid_learning_expected');
  const observed=requireJsonObject(record.observed_json||{},'invalid_learning_observed');

  if(record.economic_value_minor!=null||observed.economic_value_minor!=null){
    throw new A11RuntimeError('content_economics_require_a3_link');
  }
  if(record.signal_class!=='insufficient'||record.confidence_delta!==0){
    throw new A11RuntimeError('content_runtime_observation_only');
  }
  if(!reasonCodes.includes('INSUFFICIENT_OBSERVATIONS')&&!reasonCodes.includes('INSUFFICIENT_ECONOMIC_DATA')){
    throw new A11RuntimeError('content_runtime_reason_mismatch');
  }
  const before=record.confidence_before;
  const after=record.confidence_after;
  const delta=record.confidence_delta;
  if(!Number.isInteger(before)||!Number.isInteger(after)||!Number.isInteger(delta)||
     before<0||before>100||after<0||after>100||after-before!==delta){
    throw new A11RuntimeError('invalid_learning_confidence');
  }
  const ctr=observed.ctr_bps;
  if(ctr!=null&&(!Number.isInteger(ctr)||ctr<0||ctr>10000))throw new A11RuntimeError('invalid_learning_ctr');

  const event=await contentEvent(db,sourceEventId);
  if(!event)throw new A11RuntimeError('content_source_event_not_found',404);
  if(event.privacy_class!=='aggregated')throw new A11RuntimeError('content_source_not_aggregated');
  let metadata;
  try{metadata=JSON.parse(event.metadata_json||'{}');}catch{throw new A11RuntimeError('content_source_invalid',503);}
  const contentId=String(metadata.content_id||'').trim();
  if(!contentId)throw new A11RuntimeError('content_source_invalid',503);

  const refs=[];
  refs.push('a1:event:'+event.event_id);
  if(metadata.source_refs_hash)refs.push('content:source_refs_hash:'+String(metadata.source_refs_hash));
  const canonicalRefs=['content:'+contentId,...refs];
  const expectedSourceId=await stableId('cnt_',{content_id:contentId,refs:canonicalRefs});
  const expectedSubjectId=await stableId('can_',{content_id:contentId});
  if(sourceId!==expectedSourceId||subjectId!==expectedSubjectId){
    throw new A11RuntimeError('content_learning_identity_mismatch');
  }
  if(!evidenceRefs.includes('a1:event:'+event.event_id)){
    throw new A11RuntimeError('content_event_evidence_missing');
  }

  const duplicate=await db.prepare(`
    SELECT l.learning_record_id,l.input_hash
    FROM learning_source_links s
    JOIN learning_records l ON l.learning_source_link_id=s.learning_source_link_id
    WHERE s.source_kind='content' AND s.source_id=?1 AND s.source_snapshot_hash=?2
    ORDER BY l.created_at,l.learning_record_id
    LIMIT 1
  `).bind(sourceId,event.payload_hash).first();
  if(duplicate){
    return {status:'duplicate',learning_record_id:duplicate.learning_record_id,duplicate:true};
  }

  const {rule,policy}=await canonicalRule(db);
  const previous=await db.prepare(`
    SELECT confidence_after
    FROM learning_records
    WHERE subject_type='candidate' AND subject_id=?1
    ORDER BY created_at DESC,learning_record_id DESC
    LIMIT 1
  `).bind(subjectId).first();
  const expectedBefore=previous?Number(previous.confidence_after):Number(policy.initial_confidence);
  if(before!==expectedBefore)throw new A11RuntimeError('stale_learning_confidence',409);

  const maxUp=Number(policy?.confidence_delta_limits?.max_increase);
  const maxDown=Number(policy?.confidence_delta_limits?.max_decrease);
  if(delta>maxUp||delta<(-maxDown))throw new A11RuntimeError('learning_delta_exceeds_policy');
  if(record.signal_class==='insufficient'&&delta!==0)throw new A11RuntimeError('insufficient_signal_cannot_mutate_confidence');
  if(record.signal_class==='neutral'&&delta!==0)throw new A11RuntimeError('neutral_signal_cannot_mutate_confidence');

  const runId=await stableId('lru_',{
    event_id:event.event_id,
    rule_version_id:rule.rule_version_id,
    input_hash:inputHash
  });
  const linkId=await stableId('lsl_',{
    learning_run_id:runId,
    source_id:sourceId,
    source_snapshot_hash:event.payload_hash
  });
  const feedbackAction=actionFor(record.signal_class);
  const feedbackId=await stableId('lfb_',{record:learningRecordId,action:feedbackAction});
  if(body.learning_run_id&&body.learning_run_id!==runId)throw new A11RuntimeError('learning_run_id_mismatch');
  if(body.learning_source_link_id&&body.learning_source_link_id!==linkId)throw new A11RuntimeError('learning_source_link_id_mismatch');

  const statements=[
    db.prepare(`
      INSERT INTO learning_runs
        (learning_run_id,rule_version_id,model_version_id,policy_version,input_hash,
         started_at,completed_at,input_count,runtime_side_effects,public_side_effects)
      VALUES(?1,?2,NULL,?3,?4,?5,?5,1,0,0)
    `).bind(runId,rule.rule_version_id,policy.policy_version,inputHash,event.occurred_at),
    db.prepare(`
      INSERT INTO learning_source_links
        (learning_source_link_id,learning_run_id,source_kind,source_id,source_snapshot_hash,
         observed_at,evidence_refs_json)
      VALUES(?1,?2,'content',?3,?4,?5,?6)
    `).bind(linkId,runId,sourceId,event.payload_hash,event.occurred_at,JSON.stringify(evidenceRefs)),
    db.prepare(`
      INSERT INTO learning_records
        (learning_record_id,learning_run_id,learning_source_link_id,source_kind,source_id,
         subject_type,subject_id,signal_class,expected_json,observed_json,economic_value_minor,
         ctr_bps,confidence_before,confidence_after,confidence_delta,reason_codes_json,
         evidence_refs_json,correlation_only,causal_claim,rule_version_id,model_version_id,
         input_hash,created_at)
      VALUES(?1,?2,?3,'content',?4,'candidate',?5,?6,?7,?8,NULL,?9,?10,?11,?12,?13,?14,1,0,?15,NULL,?16,?17)
    `).bind(
      learningRecordId,runId,linkId,sourceId,subjectId,record.signal_class,
      JSON.stringify(expected),JSON.stringify(observed),ctr??null,before,after,delta,
      JSON.stringify(reasonCodes),JSON.stringify(evidenceRefs),rule.rule_version_id,inputHash,event.occurred_at
    ),
    db.prepare(`
      INSERT INTO learning_feedback
        (feedback_id,learning_record_id,target_type,target_id,action,confidence_delta,
         reason_codes_json,evidence_refs_json,execution_mode,public_side_effects,created_at)
      VALUES(?1,?2,'candidate',?3,?4,?5,?6,?7,'append_only_internal',0,?8)
    `).bind(
      feedbackId,learningRecordId,subjectId,feedbackAction,delta,
      JSON.stringify(reasonCodes),JSON.stringify(evidenceRefs),event.occurred_at
    )
  ];

  try{
    await db.batch(statements);
  }catch(error){
    const raced=await db.prepare(
      'SELECT learning_record_id,input_hash FROM learning_records WHERE learning_record_id=?1 LIMIT 1'
    ).bind(learningRecordId).first();
    if(raced&&raced.input_hash===inputHash){
      return {status:'duplicate',learning_record_id:learningRecordId,duplicate:true};
    }
    throw new A11RuntimeError('a11_storage_error',503);
  }
  return {
    status:'accepted',
    learning_record_id:learningRecordId,
    learning_run_id:runId,
    learning_source_link_id:linkId,
    duplicate:false
  };
}

export async function handleA11LearningRequest(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/internal/a11/content-learning')return null;
  if(!enabled(env.A11_LEARNING_WRITE_API_ENABLED))return json({error:'not_found'},404);
  if(!env.A11_LEARNING_WRITE_TOKEN)return json({error:'a11_learning_misconfigured'},503);
  if(!constantTimeEqual(tokenFrom(request),env.A11_LEARNING_WRITE_TOKEN))return json({error:'unauthorized'},401);
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  const type=request.headers.get('Content-Type')||'';
  if(!type.toLowerCase().includes('application/json'))return json({error:'json_required'},415);

  try{
    const raw=await request.text();
    if(new TextEncoder().encode(raw).length>32768)throw new A11RuntimeError('payload_too_large',413);
    let body;
    try{body=JSON.parse(raw);}catch{throw new A11RuntimeError('invalid_json');}
    return json(await appendContentLearning(env.GROWTH_DB,body),200);
  }catch(error){
    if(error instanceof A11RuntimeError)return json({error:error.code},error.status);
    console.error('A11 runtime error',String(error?.message||'internal_error'));
    return json({error:'internal_error'},500);
  }
}
