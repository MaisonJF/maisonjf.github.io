import { sha256Hex } from './core.js';

function enabled(value){ return String(value ?? '').toLowerCase()==='true'; }
function id(prefix){ return prefix+crypto.randomUUID(); }
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
function tokenFrom(request){
  const raw=request.headers.get('Authorization')||'';
  return raw.startsWith('Bearer ')?raw.slice(7).trim():'';
}
function constantTimeEqual(left,right){
  const a=String(left??''), b=String(right??'');
  let diff=a.length^b.length;
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++) diff|=(a.charCodeAt(i%Math.max(a.length,1))||0)^(b.charCodeAt(i%Math.max(b.length,1))||0);
  return diff===0;
}
const FORBIDDEN_KEYS=new Set([
  'password','passwd','secret','token','api_key','apikey','authorization',
  'email','phone','telephone','address','full_address','private_conversation',
  'private_chat','oracle_body','oracle_answer','paid_oracle','paid_content',
  'card_number','iban','nif','tax_id'
]);
function assertNoSensitive(value,path='payload'){
  if(Array.isArray(value)){ value.forEach((v,i)=>assertNoSensitive(v,`${path}[${i}]`)); return; }
  if(!value||typeof value!=='object') return;
  for(const [key,v] of Object.entries(value)){
    if(FORBIDDEN_KEYS.has(String(key).toLowerCase())) throw new Error(`forbidden_payload_key:${path}.${key}`);
    assertNoSensitive(v,`${path}.${key}`);
  }
}
function boundedScore(value,name){
  const n=Number(value??0);
  if(!Number.isFinite(n)||n<0||n>100) throw new Error('invalid_'+name);
  return Math.round(n);
}
function stringArray(value,name,max=20){
  if(value==null) return [];
  if(!Array.isArray(value)) throw new Error('invalid_'+name);
  return [...new Set(value.map(v=>String(v).trim()).filter(Boolean))].slice(0,max);
}
function compactJsonArray(value,name,max=20){
  if(value==null) return [];
  if(!Array.isArray(value)) throw new Error('invalid_'+name);
  return value.slice(0,max);
}
function cleanKey(value){
  const key=String(value??'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._:-]{1,159}$/.test(key)) throw new Error('invalid_ocean_key');
  return key;
}
export function normalizeOceanInput(raw){
  assertNoSensitive(raw);
  const kind=String(raw?.kind??'signal');
  if(!['signal','enrichment','hypothesis'].includes(kind)) throw new Error('invalid_kind');
  const oceanKey=cleanKey(raw?.ocean_key);
  const canonical=raw?.canonical_ocean_id==null?'':String(raw.canonical_ocean_id).trim();
  if(canonical && (canonical.length<2||canonical.length>160)) throw new Error('invalid_canonical_ocean_id');
  const sourceRef=String(raw?.source_ref??'').trim();
  if(!sourceRef||sourceRef.length>2048) throw new Error('invalid_source_ref');
  const sourceObservationId=raw?.source_observation_id==null?null:String(raw.source_observation_id).trim();
  if(sourceObservationId && !/^obs_.{36}$/.test(sourceObservationId)) throw new Error('invalid_source_observation_id');
  const summary=String(raw?.summary??'').trim();
  if(!summary||summary.length>4000) throw new Error('invalid_summary');
  const evidenceRoots=stringArray(raw?.evidence_roots,'evidence_roots',30);
  const themeCandidates=stringArray(raw?.theme_candidates,'theme_candidates',30);
  const commercialAdjacency=compactJsonArray(raw?.commercial_adjacency,'commercial_adjacency',30);
  const relevanceScore=boundedScore(raw?.relevance_score,'relevance_score');
  const commercialScore=boundedScore(raw?.commercial_score,'commercial_score');
  const observedAt=raw?.observed_at?new Date(raw.observed_at).toISOString():new Date().toISOString();
  return {
    kind,oceanKey,canonicalOceanId:canonical||null,sourceRef,sourceObservationId,summary,
    evidenceRoots,themeCandidates,commercialAdjacency,relevanceScore,commercialScore,observedAt
  };
}
export function oceanGate({canonicalOceanId,independentEvidenceCount,relevanceScore}){
  if(canonicalOceanId){
    return {
      lifecycleState:independentEvidenceCount>=2?'reinforced':'existing',
      promotionGateState:independentEvidenceCount>=3&&relevanceScore>=85?'eligible':independentEvidenceCount>=2&&relevanceScore>=70?'review':'observe'
    };
  }
  return {
    lifecycleState:independentEvidenceCount>=2&&relevanceScore>=60?'review_ready':'provisional',
    promotionGateState:independentEvidenceCount>=3&&relevanceScore>=85?'eligible':independentEvidenceCount>=2&&relevanceScore>=70?'review':'observe'
  };
}
export function shouldAlert({kind,independentEvidenceCount,relevanceScore,commercialScore}){
  if(commercialScore>=70) return true;
  if(kind==='enrichment') return relevanceScore>=50||independentEvidenceCount>=2;
  if(kind==='hypothesis') return independentEvidenceCount>=2&&relevanceScore>=60;
  return relevanceScore>=70;
}
function alertKind(input,gate){
  if(input.commercialScore>=70) return 'commercial_opportunity';
  if(input.kind==='hypothesis'&&!input.canonicalOceanId) return 'new_hypothesis';
  if(gate.lifecycleState==='reinforced') return 'reinforced';
  return 'enrichment';
}
async function all(stmt){
  const out=await stmt.all();
  return Array.isArray(out?.results)?out.results:[];
}
async function ingest(env,raw){
  const input=normalizeOceanInput(raw);
  const hash=await sha256Hex(JSON.stringify({
    ocean_key:input.oceanKey,kind:input.kind,source_ref:input.sourceRef,
    source_observation_id:input.sourceObservationId,summary:input.summary,
    evidence_roots:input.evidenceRoots,theme_candidates:input.themeCandidates,
    commercial_adjacency:input.commercialAdjacency,observed_at:input.observedAt
  }));

  const signalId=id('oms_');
  const now=new Date().toISOString();
  const signalWrite=await env.GROWTH_DB.prepare(`
    INSERT OR IGNORE INTO ocean_memory_signals
      (signal_id,ocean_key,canonical_ocean_id,signal_kind,source_ref,source_observation_id,
       summary,evidence_roots_json,theme_candidates_json,commercial_adjacency_json,
       relevance_score,commercial_score,payload_hash,observed_at,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    signalId,input.oceanKey,input.canonicalOceanId,input.kind,input.sourceRef,input.sourceObservationId,
    input.summary,JSON.stringify(input.evidenceRoots),JSON.stringify(input.themeCandidates),
    JSON.stringify(input.commercialAdjacency),input.relevanceScore,input.commercialScore,
    hash,input.observedAt,now
  ).run();

  // Idempotency is resolved by the UNIQUE payload_hash. No D1 read is needed.
  const inserted=Number(signalWrite?.meta?.changes ?? 1) > 0;
  if(!inserted){
    return {
      duplicate:true,
      payload_hash:hash,
      ocean_key:input.oceanKey,
      brain_alert:null,
      delivery_mode:'inline_no_poll',
      d1_reads_per_ingest:0
    };
  }

  // Intake gates use only the evidence already carried by this signal. Accumulated
  // state is maintained by SQL MAX/+1 operations; we never reread the Ocean here.
  const independentEvidenceCount=input.evidenceRoots.length;
  const maxRelevance=input.relevanceScore;
  const maxCommercial=input.commercialScore;
  const gate=oceanGate({
    canonicalOceanId:input.canonicalOceanId,
    independentEvidenceCount,
    relevanceScore:maxRelevance
  });

  await env.GROWTH_DB.prepare(`
    INSERT INTO ocean_memory_state
      (ocean_key,canonical_ocean_id,lifecycle_state,signal_count,independent_evidence_count,
       max_relevance_score,max_commercial_score,latest_summary,latest_theme_candidates_json,
       latest_commercial_adjacency_json,first_seen_at,last_seen_at,promotion_gate_state,
       snapshot_state,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)
    ON CONFLICT(ocean_key) DO UPDATE SET
      canonical_ocean_id=COALESCE(excluded.canonical_ocean_id,ocean_memory_state.canonical_ocean_id),
      lifecycle_state=CASE
        WHEN ocean_memory_state.lifecycle_state='reinforced' THEN 'reinforced'
        WHEN excluded.lifecycle_state='reinforced' THEN 'reinforced'
        WHEN ocean_memory_state.lifecycle_state='review_ready' AND excluded.lifecycle_state='provisional' THEN 'review_ready'
        WHEN ocean_memory_state.lifecycle_state='existing' AND excluded.lifecycle_state='provisional' THEN 'existing'
        ELSE excluded.lifecycle_state
      END,
      signal_count=ocean_memory_state.signal_count+1,
      independent_evidence_count=MAX(ocean_memory_state.independent_evidence_count,excluded.independent_evidence_count),
      max_relevance_score=MAX(ocean_memory_state.max_relevance_score,excluded.max_relevance_score),
      max_commercial_score=MAX(ocean_memory_state.max_commercial_score,excluded.max_commercial_score),
      latest_summary=excluded.latest_summary,
      latest_theme_candidates_json=excluded.latest_theme_candidates_json,
      latest_commercial_adjacency_json=excluded.latest_commercial_adjacency_json,
      first_seen_at=MIN(ocean_memory_state.first_seen_at,excluded.first_seen_at),
      last_seen_at=MAX(ocean_memory_state.last_seen_at,excluded.last_seen_at),
      promotion_gate_state=CASE
        WHEN ocean_memory_state.promotion_gate_state='eligible' OR excluded.promotion_gate_state='eligible' THEN 'eligible'
        WHEN ocean_memory_state.promotion_gate_state='review' OR excluded.promotion_gate_state='review' THEN 'review'
        ELSE 'observe'
      END,
      snapshot_state='pending',
      updated_at=excluded.updated_at
  `).bind(
    input.oceanKey,input.canonicalOceanId,gate.lifecycleState,1,independentEvidenceCount,
    maxRelevance,maxCommercial,input.summary,JSON.stringify(input.themeCandidates),
    JSON.stringify(input.commercialAdjacency),input.observedAt,input.observedAt,
    gate.promotionGateState,now
  ).run();

  let alertId=null;
  let brainAlert=null;
  if(shouldAlert({
    kind:input.kind,independentEvidenceCount,
    relevanceScore:maxRelevance,commercialScore:maxCommercial
  })){
    alertId=id('oma_');
    const priority=Math.max(maxRelevance,maxCommercial,independentEvidenceCount>=2?70:0);
    const kind=alertKind(input,gate);
    const payload={
      summary:input.summary,
      signal_kind:input.kind,
      independent_evidence_count:independentEvidenceCount,
      relevance_score:maxRelevance,
      commercial_score:maxCommercial,
      promotion_gate_state:gate.promotionGateState,
      snapshot_required:true
    };
    // The ingest response itself is the delivery channel. Store only an audit row;
    // do not create a polling queue that must be reread later.
    await env.GROWTH_DB.prepare(`
      INSERT INTO ocean_memory_alerts
        (alert_id,ocean_key,signal_id,alert_kind,priority,payload_json,delivery_state,created_at,delivered_at)
      VALUES (?,?,?,?,?,?,'delivered',?,?)
    `).bind(
      alertId,input.oceanKey,signalId,kind,priority,JSON.stringify(payload),now,now
    ).run();

    brainAlert={
      observation_id:alertId,
      event_id:null,
      territory_key:input.oceanKey,
      provider_id:'ocean_memory',
      model_id:null,
      source_class:'public_web',
      grounding_state:independentEvidenceCount>0?'grounded':'ungrounded',
      response_excerpt:input.summary,
      observed_at:now,
      evidence_id:signalId,
      strength:priority,
      confidence_class:priority>=80?'high':priority>=60?'medium':'low',
      confidence:priority/100,
      semantic_observation_id:null,
      need_id:null,
      intent_id:null,
      semantic_confidence_score:null,
      semantic_ambiguity:0,
      semantic_provider_name:null,
      semantic_provider_version:null,
      independent_roots:input.evidenceRoots,
      evidence_refs:[signalId],
      ocean_alert_kind:kind,
      ocean_alert_priority:priority,
      ocean_independent_evidence_count:independentEvidenceCount
    };
  }

  return {
    duplicate:false,
    signal_id:signalId,
    alert_id:alertId,
    ocean_key:input.oceanKey,
    lifecycle_state:gate.lifecycleState,
    promotion_gate_state:gate.promotionGateState,
    independent_evidence_count:independentEvidenceCount,
    snapshot_state:'pending',
    github_required_for_persistence:false,
    brain_alert:brainAlert,
    delivery_mode:'inline_no_poll',
    d1_reads_per_ingest:0
  };
}
function parseLimit(url){
  const n=Number(url.searchParams.get('limit')||50);
  if(!Number.isInteger(n)||n<1||n>100) throw new Error('invalid_limit');
  return n;
}
async function memoryFeed(env,url){
  const limit=parseLimit(url);
  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT * FROM brain_ocean_memory_feed
    ORDER BY last_seen_at DESC,ocean_key
    LIMIT ?
  `).bind(limit));
  return json({kind:'ocean_working_memory',storage:'D1',github_role:'snapshot_only',rows});
}
async function snapshotFeed(env,url){
  const limit=parseLimit(url);
  const states=await all(env.GROWTH_DB.prepare(`
    SELECT * FROM ocean_memory_state
    WHERE snapshot_state IN ('pending','error')
    ORDER BY updated_at,ocean_key
    LIMIT ?
  `).bind(limit));
  const rows=[];
  for(const state of states){
    const signals=await all(env.GROWTH_DB.prepare(`
      SELECT signal_id,signal_kind,source_ref,summary,evidence_roots_json,theme_candidates_json,
             commercial_adjacency_json,relevance_score,commercial_score,observed_at
      FROM ocean_memory_signals WHERE ocean_key=? ORDER BY observed_at,signal_id
    `).bind(state.ocean_key));
    rows.push({...state,signals:signals.map(signal=>({
      ...signal,
      evidence_roots:JSON.parse(signal.evidence_roots_json||'[]'),
      theme_candidates:JSON.parse(signal.theme_candidates_json||'[]'),
      commercial_adjacency:JSON.parse(signal.commercial_adjacency_json||'[]'),
      evidence_roots_json:undefined,theme_candidates_json:undefined,commercial_adjacency_json:undefined
    }))});
  }
  return json({kind:'ocean_snapshot_feed',storage:'D1',github_role:'snapshot_only',rows});
}
async function markSnapshot(env,body){
  const keys=stringArray(body?.ocean_keys,'ocean_keys',100).map(cleanKey);
  if(!keys.length) throw new Error('invalid_ocean_keys');
  const state=String(body?.state??'synced');
  if(!['synced','error'].includes(state)) throw new Error('invalid_snapshot_state');
  const now=new Date().toISOString();
  for(const key of keys){
    await env.GROWTH_DB.prepare(`
      UPDATE ocean_memory_state SET snapshot_state=?,updated_at=? WHERE ocean_key=?
    `).bind(state,now,key).run();
  }
  return json({ok:true,ocean_keys:keys,state});
}
async function alerts(env,url){
  const limit=parseLimit(url);
  const state=url.searchParams.get('state')||'pending';
  if(!['pending','delivered','suppressed'].includes(state)) throw new Error('invalid_alert_state');
  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT alert_id,ocean_key,signal_id,alert_kind,priority,payload_json,delivery_state,created_at,delivered_at
    FROM ocean_memory_alerts
    WHERE delivery_state=?
    ORDER BY priority DESC,created_at
    LIMIT ?
  `).bind(state,limit));
  return json({
    kind:'ocean_alerts',state,
    rows:rows.map(row=>({...row,payload:JSON.parse(row.payload_json||'{}'),payload_json:undefined}))
  });
}
async function markDelivered(env,body){
  const alertId=String(body?.alert_id??'').trim();
  if(!/^oma_.{36}$/.test(alertId)) throw new Error('invalid_alert_id');
  const state=String(body?.state??'delivered');
  if(!['delivered','suppressed'].includes(state)) throw new Error('invalid_alert_state');
  const now=new Date().toISOString();
  await env.GROWTH_DB.prepare(`
    UPDATE ocean_memory_alerts
    SET delivery_state=?,delivered_at=?
    WHERE alert_id=? AND delivery_state='pending'
  `).bind(state,now,alertId).run();
  return json({ok:true,alert_id:alertId,state});
}

export async function handleOceanMemoryRequest(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/internal/oceans/')) return null;
  if(!enabled(env.OCEAN_MEMORY_ENABLED)) return json({error:'not_found'},404);
  if(!env.BRAIN_CONTROL_TOKEN) return json({error:'ocean_memory_misconfigured'},503);
  if(!constantTimeEqual(tokenFrom(request),env.BRAIN_CONTROL_TOKEN)) return json({error:'unauthorized'},401);
  try{
    if(url.pathname==='/internal/oceans/ingest'&&request.method==='POST'){
      const text=await request.text();
      if(text.length>25000) return json({error:'payload_too_large'},413);
      return json(await ingest(env,JSON.parse(text)));
    }
    if(url.pathname==='/internal/oceans/memory'&&request.method==='GET') return await memoryFeed(env,url);
    if(url.pathname==='/internal/oceans/snapshot'&&request.method==='GET') return await snapshotFeed(env,url);
    if(url.pathname==='/internal/oceans/snapshot/mark'&&request.method==='POST') return await markSnapshot(env,await request.json());
    if(url.pathname==='/internal/oceans/alerts'&&request.method==='GET') return await alerts(env,url);
    if(url.pathname==='/internal/oceans/alerts/mark'&&request.method==='POST'){
      return await markDelivered(env,await request.json());
    }
    return json({error:'method_not_allowed'},405);
  }catch(error){
    const message=String(error?.message||'bad_request');
    if(message.startsWith('invalid_')||message.startsWith('forbidden_payload_key')) return json({error:message},400);
    if(error instanceof SyntaxError) return json({error:'invalid_json'},400);
    console.error('Ocean memory error',message);
    return json({error:'internal_error'},500);
  }
}
