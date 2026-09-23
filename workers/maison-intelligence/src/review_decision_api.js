const MAX_BODY_BYTES = 64 * 1024;

function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function json(body, status=200) {
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

function constantTimeEqual(left, right) {
  const a=String(left ?? '');
  const b=String(right ?? '');
  let diff=a.length ^ b.length;
  const n=Math.max(a.length,b.length);
  for (let i=0;i<n;i++) {
    diff |= (a.charCodeAt(i % Math.max(a.length,1)) || 0) ^ (b.charCodeAt(i % Math.max(b.length,1)) || 0);
  }
  return diff===0;
}

function bearer(request) {
  const raw=request.headers.get('Authorization') || '';
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

async function sha256Hex(value) {
  const bytes=new Uint8Array([...unescape(encodeURIComponent(String(value)))].map(c=>c.charCodeAt(0)));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function assertId(value, prefix, code) {
  assert(typeof value==='string' && value.length===40 && value.startsWith(prefix),code);
}

function evidenceRefs(value) {
  assert(Array.isArray(value) && value.length<=100,'invalid_review_evidence_refs');
  assert(value.every(x=>typeof x==='string' && x.length>0 && x.length<=500),'invalid_review_evidence_refs');
  return [...new Set(value)].sort();
}

const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
function rejectPII(value) {
  if (typeof value==='string') {
    assert(!EMAIL_RE.test(value),'review_decision_pii_forbidden');
  } else if (Array.isArray(value)) {
    value.forEach(rejectPII);
  } else if (value && typeof value==='object') {
    for (const [key,item] of Object.entries(value)) {
      assert(!['email','phone','full_name','address','nif','tax_id'].includes(key.toLowerCase()),'review_decision_pii_forbidden');
      rejectPII(item);
    }
  }
}

async function first(env, sql, ...params) {
  const out=await env.GROWTH_DB.prepare(sql).bind(...params).all();
  return out?.results?.[0] ?? null;
}

export async function handleBrainReviewDecisionRequest(request, env) {
  const url=new URL(request.url);
  if (!url.pathname.startsWith('/internal/reviews/')) return null;
  if (!enabled(env.BRAIN_REVIEW_DECISION_ENABLED)) return json({error:'not_found'},404);
  if (!env.BRAIN_REVIEW_DECISION_TOKEN) return json({error:'review_decision_api_misconfigured'},503);
  if (!constantTimeEqual(bearer(request),env.BRAIN_REVIEW_DECISION_TOKEN)) return json({error:'unauthorized'},401);
  if (request.method!=='POST') return json({error:'method_not_allowed'},405);
  if (url.pathname!=='/internal/reviews/a12') return json({error:'not_found'},404);

  try {
    const type=request.headers.get('content-type') || '';
    assert(type.toLowerCase().includes('application/json'),'content_type_must_be_json');
    const declared=Number(request.headers.get('content-length') || '0');
    if (declared) assert(declared<=MAX_BODY_BYTES,'review_decision_body_too_large');
    const raw=await request.text();
    assert(new Blob([raw]).size<=MAX_BODY_BYTES,'review_decision_body_too_large');
    const payload=JSON.parse(raw);
    rejectPII(payload);

    assert(payload?.schema==='maison.a12-review-decision.v1','unsupported_review_decision_schema');
    assertId(payload.queue_id,'inq_','invalid_queue_id');
    assert(['approved','rejected'].includes(payload.decision),'invalid_review_decision');
    assert(typeof payload.decision_reason==='string' && payload.decision_reason.trim().length>=3 && payload.decision_reason.length<=2000,'invalid_decision_reason');
    const refs=evidenceRefs(payload.evidence_refs ?? []);

    const row=await first(env,`
      SELECT q.queue_id,q.action_id,q.status,a.action_key,a.risk_class,a.autonomy_level,
             a.public_write_authorized,a.public_side_effects
      FROM autonomy_human_queue q
      JOIN autonomy_action_log a ON a.action_id=q.action_id
      WHERE q.queue_id=?
    `,payload.queue_id);
    assert(row,'review_queue_item_not_found');
    assert(row.status==='pending','review_queue_item_not_pending');
    assert(row.action_key==='commercial_opportunity_review','review_action_not_commercial_opportunity');
    assert(row.autonomy_level==='human_approval_required','review_action_not_human_gated');
    assert(Number(row.public_write_authorized)===0 && Number(row.public_side_effects)===0,'review_action_authorization_drift');

    const existing=await first(env,
      'SELECT * FROM autonomy_human_review_resolutions WHERE queue_id=?',
      payload.queue_id
    );
    if (existing) {
      const storedRefs=JSON.parse(existing.evidence_refs_json || '[]').slice().sort();
      const same=existing.decision===payload.decision
        && existing.decision_reason===payload.decision_reason.trim()
        && JSON.stringify(storedRefs)===JSON.stringify(refs)
        && existing.approved_scope==='experiment_planning_only'
        && Number(existing.public_write_authorized)===0
        && Number(existing.outbound_authorized)===0
        && Number(existing.spend_authorized)===0
        && Number(existing.experiment_execution_authorized)===0;
      if (!same) return json({error:'review_decision_already_resolved_with_different_payload'},409);
      return json({
        stored:true,idempotent:true,queue_id:payload.queue_id,
        review_resolution_id:existing.review_resolution_id,
        decision:existing.decision,
        approved_scope:'experiment_planning_only',
        experiment_planning_authorized:existing.decision==='approved',
        experiment_execution_authorized:false,
        public_write_authorized:false,outbound_authorized:false,spend_authorized:false
      });
    }

    const digest=await sha256Hex(payload.queue_id);
    const resolutionId='rvr_'+digest.slice(0,36);
    const decidedAt=new Date().toISOString();
    await env.GROWTH_DB.batch([
      env.GROWTH_DB.prepare(`
        INSERT INTO autonomy_human_review_resolutions(
          review_resolution_id,queue_id,action_id,decision,approved_scope,
          decision_reason,evidence_refs_json,actor_kind,
          public_write_authorized,outbound_authorized,spend_authorized,
          experiment_execution_authorized,decided_at
        ) VALUES(?,?,?,?,'experiment_planning_only',?,?,'human',0,0,0,0,?)
      `).bind(
        resolutionId,payload.queue_id,row.action_id,payload.decision,
        payload.decision_reason.trim(),JSON.stringify(refs),decidedAt
      )
    ]);

    return json({
      stored:true,idempotent:false,queue_id:payload.queue_id,
      review_resolution_id:resolutionId,
      decision:payload.decision,
      approved_scope:'experiment_planning_only',
      experiment_planning_authorized:payload.decision==='approved',
      experiment_execution_authorized:false,
      public_write_authorized:false,outbound_authorized:false,spend_authorized:false
    });
  } catch (error) {
    const message=error?.message || 'invalid_review_decision';
    if (message.includes('constraint') || message.includes('FOREIGN KEY') || message.includes('UNIQUE')) {
      console.error('Review decision database constraint',message);
      return json({error:'review_decision_constraint_failed'},409);
    }
    if (message==='Unexpected end of JSON input' || message.includes('JSON')) return json({error:'invalid_json'},400);
    return json({error:message},400);
  }
}
