const MAX_BODY_BYTES = 512 * 1024;
const MAX_OFFERS = 20;
const MAX_MATCHES = 50;
const ACTION_KEY = 'commercial_opportunity_review';

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
  return diff === 0;
}

function bearer(request) {
  const raw=request.headers.get('Authorization') || '';
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

async function sha256Hex(value) {
  const bytes=new TextEncoder().encode(typeof value === 'string' ? value : canonical(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function stableId(prefix, payload) {
  return prefix + (await sha256Hex(payload)).slice(0,36);
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function assertId(value, prefix, code) {
  assert(typeof value === 'string' && value.length === 40 && value.startsWith(prefix), code);
}

function assertArray(value, code, max=100) {
  assert(Array.isArray(value) && value.length <= max, code);
  return value;
}

function assertStringArray(value, code, max=100) {
  const rows=assertArray(value ?? [],code,max);
  assert(rows.every(x=>typeof x==='string' && x.length>0 && x.length<=500),code);
  return rows;
}

function assertNullableNumber(value, min, max, code) {
  assert(value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value) && value>=min && value<=max),code);
}

const FORBIDDEN_KEYS=new Set([
  'email','customer_email','billing_email','phone','telephone','mobile','full_name',
  'first_name','last_name','address','postal_code','nif','vat_number','tax_id','iban',
  'card_number','billing_details','shipping_details','stripe_customer_id','customer_id',
  'oracle_response','oracle_answer','oracle_content','reading_text','paid_oracle_text'
]);
const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function privacyScan(value, path='$') {
  if (Array.isArray(value)) {
    value.forEach((v,i)=>privacyScan(v,`${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key,item] of Object.entries(value)) {
      const lower=key.toLowerCase();
      assert(!FORBIDDEN_KEYS.has(lower),`proposal_privacy_forbidden_key:${path}.${key}`);
      privacyScan(item,`${path}.${key}`);
    }
    return;
  }
  if (typeof value === 'string') {
    assert(!EMAIL_RE.test(value),`proposal_privacy_email_detected:${path}`);
  }
}

function validateOpportunity(row) {
  assert(row && typeof row==='object' && !Array.isArray(row),'invalid_opportunity');
  assertId(row.opportunity_id,'opp_','invalid_opportunity_id');
  if (row.need_id != null) assertId(row.need_id,'ned_','invalid_need_id');
  assertNullableNumber(row.opportunity_score,0,100,'invalid_opportunity_score');
  assertNullableNumber(row.confidence,0,1,'invalid_opportunity_confidence');
  assert(['observe','recommend','human_review_required'].includes(row.status),'invalid_opportunity_status');
  assertStringArray(row.known_dimensions,'invalid_known_dimensions');
  assertStringArray(row.unknown_dimensions,'invalid_unknown_dimensions');
  assertStringArray(row.evidence_refs,'invalid_evidence_refs');
  assertStringArray(row.existing_solution_ids,'invalid_existing_solution_ids');
  for (const id of row.existing_solution_ids || []) assertId(id,'sol_','invalid_existing_solution_id');
  assertStringArray(row.knowledge_context_refs,'invalid_knowledge_context_refs');
  assertStringArray(row.reason_codes,'invalid_reason_codes');
  assert(typeof row.rule_version_id==='string' && row.rule_version_id.length>0 && row.rule_version_id.length<=160,'invalid_rule_version_id');
  assert(row.model_version_id == null || (typeof row.model_version_id==='string' && row.model_version_id.length<=160),'invalid_model_version_id');
  assert(typeof row.input_hash==='string' && /^[0-9a-f]{64}$/.test(row.input_hash),'invalid_input_hash');
  assert(typeof row.created_at==='string' && !Number.isNaN(Date.parse(row.created_at)),'invalid_created_at');
}

function validateOffer(row, opportunityId) {
  assert(row && typeof row==='object' && !Array.isArray(row),'invalid_offer');
  assertId(row.offer_hypothesis_id,'ofh_','invalid_offer_hypothesis_id');
  assert(row.opportunity_id===opportunityId,'offer_opportunity_mismatch');
  const allowed=new Set([
    'physical_product','digital_product','ebook','service','workshop','experience','b2b',
    'wholesale','white_label','licensing','subscription','bundle','partnership',
    'personalisation','corporate_gifting','ip_content_licensing','oracle'
  ]);
  assert(allowed.has(row.offer_type),'invalid_offer_type');
  const a3Allowed=new Set(['oracle','physical_product','service','ebook','b2b','company','digital_collection','future_product']);
  assert(a3Allowed.has(row.a3_solution_type),'invalid_a3_solution_type');
  if (row.existing_solution_id != null) assertId(row.existing_solution_id,'sol_','invalid_offer_solution_id');
  assertNullableNumber(row.fit_score,0,100,'invalid_offer_fit_score');
  assertNullableNumber(row.fit_confidence,0,1,'invalid_offer_fit_confidence');
  assert(row.economics && typeof row.economics==='object' && !Array.isArray(row.economics),'invalid_offer_economics');
  assertStringArray(row.evidence_refs,'invalid_offer_evidence_refs');
  assertStringArray(row.reason_codes,'invalid_offer_reason_codes');
  assert(row.human_review_required == null || row.human_review_required===true,'offer_human_review_required');
  assert(row.launch_authorized == null || row.launch_authorized===false,'offer_launch_authorization_forbidden');
  assert(row.price_authorized == null || row.price_authorized===false,'offer_price_authorization_forbidden');
  assert(row.public_side_effects == null || row.public_side_effects===false,'offer_public_side_effect_forbidden');
  assert(typeof row.created_at==='string' && !Number.isNaN(Date.parse(row.created_at)),'invalid_offer_created_at');
}

function validateMatch(row, offerIds) {
  assert(row && typeof row==='object' && !Array.isArray(row),'invalid_distribution_match');
  assertId(row.distribution_match_id,'dma_','invalid_distribution_match_id');
  assert(offerIds.has(row.offer_hypothesis_id),'distribution_offer_mismatch');
  assert(typeof row.amplifier_ref==='string' && row.amplifier_ref.length>0 && row.amplifier_ref.length<=500,'invalid_amplifier_ref');
  assert(typeof row.moment_key==='string' && row.moment_key.length>0 && row.moment_key.length<=200,'invalid_moment_key');
  assert(typeof row.channel_class==='string' && row.channel_class.length>0 && row.channel_class.length<=120,'invalid_channel_class');
  assertNullableNumber(row.fit_score,0,100,'invalid_distribution_fit_score');
  assertNullableNumber(row.fit_confidence,0,1,'invalid_distribution_fit_confidence');
  assertStringArray(row.known_dimensions,'invalid_distribution_known');
  assertStringArray(row.unknown_dimensions,'invalid_distribution_unknown');
  assertStringArray(row.evidence_refs,'invalid_distribution_evidence');
  assert(row.economics && typeof row.economics==='object' && !Array.isArray(row.economics),'invalid_distribution_economics');
  assert(['zero_cash_story','pr_editorial','product_seeding','affiliate','revenue_share','barter','partnership','b2b','observe','no_action'].includes(row.recommended_strategy),'invalid_distribution_strategy');
  assert(['observe','enrich_data','recommend','rejected'].includes(row.recommendation_state),'invalid_distribution_state');
  assert(row.outbound_authorized == null || row.outbound_authorized===false,'distribution_outbound_authorization_forbidden');
  assert(row.spend_authorized == null || row.spend_authorized===false,'distribution_spend_authorization_forbidden');
  assert(typeof row.created_at==='string' && !Number.isNaN(Date.parse(row.created_at)),'invalid_distribution_created_at');
}

function validateValidationPlan(row) {
  assert(row && typeof row==='object' && !Array.isArray(row),'invalid_validation_plan');
  assertId(row.validation_plan_id,'vpl_','invalid_validation_plan_id');
  assertId(row.review_resolution_id,'rvr_','invalid_review_resolution_id');
  assertId(row.opportunity_id,'opp_','invalid_validation_opportunity_id');
  assertId(row.offer_hypothesis_id,'ofh_','invalid_validation_offer_id');
  const kinds=new Set([
    'a8_cta_existing_solution','manual_b2b_pilot','manual_service_pilot',
    'manual_physical_pilot','manual_distribution_pilot','manual_validation'
  ]);
  assert(kinds.has(row.plan_kind),'invalid_validation_plan_kind');
  if (row.existing_solution_id != null) assertId(row.existing_solution_id,'sol_','invalid_validation_solution_id');
  assert(row.a7_decision_id == null,'validation_a7_decision_must_start_null');
  assert(row.a8_experiment_id == null,'validation_a8_experiment_must_start_null');
  assert(typeof row.hypothesis==='string' && row.hypothesis.trim().length>=10 && row.hypothesis.length<=1000,'invalid_validation_hypothesis');
  assert(row.validation_mode == null || (typeof row.validation_mode==='string' && row.validation_mode.length<=200),'invalid_validation_mode');
  assert(row.primary_metric_key == null || ['economic_value_per_eligible_session','cta_click_rate','conversion_rate'].includes(row.primary_metric_key),'invalid_validation_metric');
  assertStringArray(row.evidence_refs,'invalid_validation_evidence');
  assertStringArray(row.reason_codes,'invalid_validation_reasons');
  assert(['planning','blocked_needs_a7_decision','ready_for_a8_draft','manual_pilot_required','rejected'].includes(row.state),'invalid_validation_state');
  assert(row.public_write_authorized===false,'validation_public_write_forbidden');
  assert(row.outbound_authorized===false,'validation_outbound_forbidden');
  assert(row.spend_authorized===false,'validation_spend_forbidden');
  assert(row.experiment_execution_authorized===false,'validation_experiment_execution_forbidden');
  assert(typeof row.created_at==='string' && !Number.isNaN(Date.parse(row.created_at)),'invalid_validation_created_at');
  if (row.plan_kind==='a8_cta_existing_solution') {
    assert(row.existing_solution_id != null,'a8_validation_requires_existing_solution');
    assert(row.state==='blocked_needs_a7_decision','a8_validation_must_wait_for_a7');
  }
}

function validateReview(row, opportunityId, offerIds) {
  assert(row && typeof row==='object' && !Array.isArray(row),'invalid_a12_review');
  assert(row.opportunity_id===opportunityId,'review_opportunity_mismatch');
  assert(offerIds.has(row.offer_hypothesis_id),'review_offer_mismatch');
  assert(row.requested_autonomy_level==='human_approval_required','review_must_require_human');
  assert(row.human_review_required===true,'review_human_required');
  assert(row.outbound_authorized===false,'review_outbound_forbidden');
  assert(row.spend_authorized===false,'review_spend_forbidden');
  assert(row.public_write_authorized===false,'review_public_write_forbidden');
  assertStringArray(row.evidence_refs,'invalid_review_evidence');
  assertStringArray(row.reason_codes,'invalid_review_reasons');
}

function storedOpportunity(row) {
  return {
    opportunity_id:row.opportunity_id, need_id:row.need_id, territory_code:row.territory_code,
    opportunity_score:row.opportunity_score, confidence:row.confidence,
    known_dimensions:JSON.parse(row.known_dimensions_json), unknown_dimensions:JSON.parse(row.unknown_dimensions_json),
    evidence_refs:JSON.parse(row.evidence_refs_json), existing_solution_ids:JSON.parse(row.existing_solution_ids_json),
    knowledge_context_refs:JSON.parse(row.knowledge_context_refs_json), status:row.status,
    reason_codes:JSON.parse(row.reason_codes_json), rule_version_id:row.rule_version_id,
    model_version_id:row.model_version_id, input_hash:row.input_hash
  };
}

function semanticOpportunity(row) {
  return {
    opportunity_id:row.opportunity_id, need_id:row.need_id ?? null, territory_code:row.territory_code ?? null,
    opportunity_score:row.opportunity_score ?? null, confidence:row.confidence,
    known_dimensions:row.known_dimensions ?? [], unknown_dimensions:row.unknown_dimensions ?? [],
    evidence_refs:row.evidence_refs ?? [], existing_solution_ids:row.existing_solution_ids ?? [],
    knowledge_context_refs:row.knowledge_context_refs ?? [], status:row.status,
    reason_codes:row.reason_codes ?? [], rule_version_id:row.rule_version_id,
    model_version_id:row.model_version_id ?? null, input_hash:row.input_hash
  };
}

function storedOffer(row) {
  return {
    offer_hypothesis_id:row.offer_hypothesis_id, opportunity_id:row.opportunity_id,
    offer_type:row.offer_type, a3_solution_type:row.a3_solution_type,
    existing_solution_id:row.existing_solution_id, fit_score:row.fit_score,
    fit_confidence:row.fit_confidence, economics:JSON.parse(row.economics_json),
    validation_mode:row.validation_mode, evidence_refs:JSON.parse(row.evidence_refs_json),
    reason_codes:JSON.parse(row.reason_codes_json)
  };
}

function semanticOffer(row) {
  return {
    offer_hypothesis_id:row.offer_hypothesis_id, opportunity_id:row.opportunity_id,
    offer_type:row.offer_type, a3_solution_type:row.a3_solution_type,
    existing_solution_id:row.existing_solution_id ?? null, fit_score:row.fit_score ?? null,
    fit_confidence:row.fit_confidence, economics:row.economics ?? {},
    validation_mode:row.validation_mode ?? null, evidence_refs:row.evidence_refs ?? [],
    reason_codes:row.reason_codes ?? []
  };
}

function storedMatch(row) {
  return {
    distribution_match_id:row.distribution_match_id, offer_hypothesis_id:row.offer_hypothesis_id,
    amplifier_ref:row.amplifier_ref, moment_key:row.moment_key, story_angle_key:row.story_angle_key,
    channel_class:row.channel_class, fit_score:row.fit_score, fit_confidence:row.fit_confidence,
    known_dimensions:JSON.parse(row.known_dimensions_json), unknown_dimensions:JSON.parse(row.unknown_dimensions_json),
    evidence_refs:JSON.parse(row.evidence_refs_json), economics:JSON.parse(row.economics_json),
    recommended_strategy:row.recommended_strategy, recommendation_state:row.recommendation_state
  };
}

function semanticMatch(row) {
  return {
    distribution_match_id:row.distribution_match_id, offer_hypothesis_id:row.offer_hypothesis_id,
    amplifier_ref:row.amplifier_ref, moment_key:row.moment_key, story_angle_key:row.story_angle_key ?? null,
    channel_class:row.channel_class, fit_score:row.fit_score ?? null, fit_confidence:row.fit_confidence,
    known_dimensions:row.known_dimensions ?? [], unknown_dimensions:row.unknown_dimensions ?? [],
    evidence_refs:row.evidence_refs ?? [], economics:row.economics ?? {},
    recommended_strategy:row.recommended_strategy, recommendation_state:row.recommendation_state
  };
}

function storedValidationPlan(row) {
  return {
    validation_plan_id:row.validation_plan_id,
    review_resolution_id:row.review_resolution_id,
    opportunity_id:row.opportunity_id,
    offer_hypothesis_id:row.offer_hypothesis_id,
    plan_kind:row.plan_kind,
    existing_solution_id:row.existing_solution_id,
    a7_decision_id:row.a7_decision_id,
    a8_experiment_id:row.a8_experiment_id,
    hypothesis:row.hypothesis,
    validation_mode:row.validation_mode,
    primary_metric_key:row.primary_metric_key,
    evidence_refs:JSON.parse(row.evidence_refs_json),
    reason_codes:JSON.parse(row.reason_codes_json),
    state:row.state,
    public_write_authorized:Boolean(row.public_write_authorized),
    outbound_authorized:Boolean(row.outbound_authorized),
    spend_authorized:Boolean(row.spend_authorized),
    experiment_execution_authorized:Boolean(row.experiment_execution_authorized)
  };
}

function semanticValidationPlan(row) {
  return {
    validation_plan_id:row.validation_plan_id,
    review_resolution_id:row.review_resolution_id,
    opportunity_id:row.opportunity_id,
    offer_hypothesis_id:row.offer_hypothesis_id,
    plan_kind:row.plan_kind,
    existing_solution_id:row.existing_solution_id ?? null,
    a7_decision_id:null,
    a8_experiment_id:null,
    hypothesis:row.hypothesis,
    validation_mode:row.validation_mode ?? null,
    primary_metric_key:row.primary_metric_key ?? null,
    evidence_refs:row.evidence_refs ?? [],
    reason_codes:row.reason_codes ?? [],
    state:row.state,
    public_write_authorized:false,
    outbound_authorized:false,
    spend_authorized:false,
    experiment_execution_authorized:false
  };
}

async function first(env, sql, ...params) {
  const out=await env.GROWTH_DB.prepare(sql).bind(...params).all();
  return out?.results?.[0] ?? null;
}

async function preflight(env, opportunity, offers, matches) {
  const inserts=[];

  const existingOpp=await first(env,'SELECT * FROM opportunity_hypotheses WHERE opportunity_id=?',opportunity.opportunity_id);
  if (existingOpp) {
    assert(canonical(storedOpportunity(existingOpp))===canonical(semanticOpportunity(opportunity)),'opportunity_payload_drift');
  } else {
    inserts.push(env.GROWTH_DB.prepare(`
      INSERT INTO opportunity_hypotheses(
        opportunity_id,need_id,territory_code,opportunity_score,confidence,
        known_dimensions_json,unknown_dimensions_json,evidence_refs_json,
        existing_solution_ids_json,knowledge_context_refs_json,status,reason_codes_json,
        rule_version_id,model_version_id,input_hash,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      opportunity.opportunity_id,opportunity.need_id ?? null,opportunity.territory_code ?? null,
      opportunity.opportunity_score ?? null,opportunity.confidence,
      JSON.stringify(opportunity.known_dimensions ?? []),JSON.stringify(opportunity.unknown_dimensions ?? []),
      JSON.stringify(opportunity.evidence_refs ?? []),JSON.stringify(opportunity.existing_solution_ids ?? []),
      JSON.stringify(opportunity.knowledge_context_refs ?? []),opportunity.status,
      JSON.stringify(opportunity.reason_codes ?? []),opportunity.rule_version_id,
      opportunity.model_version_id ?? null,opportunity.input_hash,opportunity.created_at
    ));
  }

  for (const offer of offers) {
    const existing=await first(env,'SELECT * FROM opportunity_offer_hypotheses WHERE offer_hypothesis_id=?',offer.offer_hypothesis_id);
    if (existing) {
      assert(canonical(storedOffer(existing))===canonical(semanticOffer(offer)),'offer_payload_drift');
      continue;
    }
    inserts.push(env.GROWTH_DB.prepare(`
      INSERT INTO opportunity_offer_hypotheses(
        offer_hypothesis_id,opportunity_id,offer_type,a3_solution_type,existing_solution_id,
        fit_score,fit_confidence,economics_json,validation_mode,evidence_refs_json,
        reason_codes_json,human_review_required,launch_authorized,price_authorized,
        public_side_effects,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,0,0,0,?)
    `).bind(
      offer.offer_hypothesis_id,offer.opportunity_id,offer.offer_type,offer.a3_solution_type,
      offer.existing_solution_id ?? null,offer.fit_score ?? null,offer.fit_confidence,
      JSON.stringify(offer.economics ?? {}),offer.validation_mode ?? null,
      JSON.stringify(offer.evidence_refs ?? []),JSON.stringify(offer.reason_codes ?? []),
      offer.created_at
    ));
  }

  for (const match of matches) {
    const existing=await first(env,'SELECT * FROM earned_distribution_match_assessments WHERE distribution_match_id=?',match.distribution_match_id);
    if (existing) {
      assert(canonical(storedMatch(existing))===canonical(semanticMatch(match)),'distribution_payload_drift');
      continue;
    }
    inserts.push(env.GROWTH_DB.prepare(`
      INSERT INTO earned_distribution_match_assessments(
        distribution_match_id,offer_hypothesis_id,amplifier_ref,moment_key,story_angle_key,
        channel_class,fit_score,fit_confidence,known_dimensions_json,unknown_dimensions_json,
        evidence_refs_json,economics_json,recommended_strategy,recommendation_state,
        a12_review_ref,experiment_id,outbound_authorized,spend_authorized,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,0,0,?)
    `).bind(
      match.distribution_match_id,match.offer_hypothesis_id,match.amplifier_ref,match.moment_key,
      match.story_angle_key ?? null,match.channel_class,match.fit_score ?? null,match.fit_confidence,
      JSON.stringify(match.known_dimensions ?? []),JSON.stringify(match.unknown_dimensions ?? []),
      JSON.stringify(match.evidence_refs ?? []),JSON.stringify(match.economics ?? {}),
      match.recommended_strategy,match.recommendation_state,match.created_at
    ));
  }
  return inserts;
}

async function reviewStatements(env, opportunity, reviews, now) {
  const inserts=[];
  const links=[];
  for (const review of reviews) {
    const identity={
      action_key:ACTION_KEY,
      opportunity_id:opportunity.opportunity_id,
      offer_hypothesis_id:review.offer_hypothesis_id,
      evidence_refs:[...(review.evidence_refs ?? [])].sort()
    };
    const actionId=await stableId('act_',identity);
    const queueId=await stableId('inq_',{action_id:actionId,kind:'human_review'});
    const linkId=await stableId('gvl_',{action_id:actionId,opportunity_id:opportunity.opportunity_id});

    const existingAction=await first(env,'SELECT * FROM autonomy_action_log WHERE action_id=?',actionId);
    if (!existingAction) {
      inserts.push(env.GROWTH_DB.prepare(`
        INSERT INTO autonomy_action_log(
          action_id,autonomy_run_id,action_key,risk_class,autonomy_level,
          decision_id,experiment_result_id,publish_run_id,promotion_run_id,learning_record_id,
          evidence_refs_json,reason_codes_json,result_json,rollback_ref,
          public_write_authorized,public_side_effects,created_at
        ) VALUES(?,NULL,?,'medium','human_approval_required',NULL,NULL,NULL,NULL,NULL,?,?,?,NULL,0,0,?)
      `).bind(
        actionId,ACTION_KEY,JSON.stringify(review.evidence_refs ?? []),
        JSON.stringify(review.reason_codes ?? []),
        JSON.stringify({
          opportunity_id:opportunity.opportunity_id,
          offer_hypothesis_id:review.offer_hypothesis_id,
          requested_autonomy_level:'human_approval_required',
          outbound_authorized:false,spend_authorized:false,public_write_authorized:false
        }),
        now
      ));
    } else {
      assert(existingAction.action_key===ACTION_KEY,'a12_action_payload_drift');
      assert(existingAction.risk_class==='medium' && existingAction.autonomy_level==='human_approval_required','a12_action_governance_drift');
      assert(Number(existingAction.public_write_authorized)===0 && Number(existingAction.public_side_effects)===0,'a12_action_authorization_drift');
    }

    const existingQueue=await first(env,'SELECT * FROM autonomy_human_queue WHERE queue_id=?',queueId);
    if (!existingQueue) {
      inserts.push(env.GROWTH_DB.prepare(`
        INSERT INTO autonomy_human_queue(queue_id,action_id,priority,status,reason_codes_json,created_at)
        VALUES(?,?,50,'pending',?,?)
      `).bind(queueId,actionId,JSON.stringify(review.reason_codes ?? []),now));
    } else {
      assert(existingQueue.action_id===actionId && ['pending','approved','rejected','expired'].includes(existingQueue.status),'a12_queue_payload_drift');
    }

    const existingLink=await first(env,'SELECT * FROM a14_governance_links WHERE governance_link_id=?',linkId);
    if (!existingLink) {
      links.push(env.GROWTH_DB.prepare(`
        INSERT INTO a14_governance_links(
          governance_link_id,opportunity_id,distribution_match_id,action_id,queue_id,evidence_refs_json,linked_at
        ) VALUES(?,?,NULL,?,?,?,?)
      `).bind(linkId,opportunity.opportunity_id,actionId,queueId,JSON.stringify(review.evidence_refs ?? []),now));
    } else {
      assert(existingLink.opportunity_id===opportunity.opportunity_id && existingLink.action_id===actionId && existingLink.queue_id===queueId,'a14_governance_link_drift');
    }
  }
  return {inserts,links};
}

async function persistValidationPlan(env, plan) {
  const byId=await first(env,'SELECT * FROM a14_validation_plans WHERE validation_plan_id=?',plan.validation_plan_id);
  const byReview=await first(env,'SELECT * FROM a14_validation_plans WHERE review_resolution_id=?',plan.review_resolution_id);
  const existing=byId || byReview;
  if (existing) {
    assert(canonical(storedValidationPlan(existing))===canonical(semanticValidationPlan(plan)),'validation_plan_payload_drift');
    return {inserted:false};
  }

  const source=await first(env,`
    SELECT
      r.review_resolution_id,r.decision,r.approved_scope,
      r.public_write_authorized,r.outbound_authorized,r.spend_authorized,
      r.experiment_execution_authorized,g.opportunity_id,
      json_extract(a.result_json,'$.offer_hypothesis_id') AS offer_hypothesis_id,
      h.existing_solution_id,h.validation_mode,h.offer_type
    FROM autonomy_human_review_resolutions r
    JOIN autonomy_action_log a ON a.action_id=r.action_id
    JOIN a14_governance_links g ON g.action_id=r.action_id
    JOIN opportunity_offer_hypotheses h
      ON h.offer_hypothesis_id=json_extract(a.result_json,'$.offer_hypothesis_id')
    WHERE r.review_resolution_id=?
  `,plan.review_resolution_id);
  assert(source,'approved_review_resolution_not_found');
  assert(source.decision==='approved','validation_plan_requires_approved_review');
  assert(source.approved_scope==='experiment_planning_only','validation_plan_requires_planning_scope');
  assert(Number(source.public_write_authorized)===0,'validation_review_public_write_drift');
  assert(Number(source.outbound_authorized)===0,'validation_review_outbound_drift');
  assert(Number(source.spend_authorized)===0,'validation_review_spend_drift');
  assert(Number(source.experiment_execution_authorized)===0,'validation_review_execution_drift');
  assert(source.opportunity_id===plan.opportunity_id,'validation_opportunity_mismatch');
  assert(source.offer_hypothesis_id===plan.offer_hypothesis_id,'validation_offer_mismatch');
  assert((source.existing_solution_id ?? null)===(plan.existing_solution_id ?? null),'validation_existing_solution_mismatch');
  assert((source.validation_mode ?? null)===(plan.validation_mode ?? null),'validation_mode_mismatch');

  await env.GROWTH_DB.batch([
    env.GROWTH_DB.prepare(`
      INSERT INTO a14_validation_plans(
        validation_plan_id,review_resolution_id,opportunity_id,offer_hypothesis_id,
        plan_kind,existing_solution_id,a7_decision_id,a8_experiment_id,hypothesis,
        validation_mode,primary_metric_key,evidence_refs_json,reason_codes_json,state,
        public_write_authorized,outbound_authorized,spend_authorized,
        experiment_execution_authorized,created_at
      ) VALUES(?,?,?,?,?,?,NULL,NULL,?,?,?,?,?,?,0,0,0,0,?)
    `).bind(
      plan.validation_plan_id,plan.review_resolution_id,plan.opportunity_id,
      plan.offer_hypothesis_id,plan.plan_kind,plan.existing_solution_id ?? null,
      plan.hypothesis,plan.validation_mode ?? null,plan.primary_metric_key ?? null,
      JSON.stringify(plan.evidence_refs ?? []),JSON.stringify(plan.reason_codes ?? []),
      plan.state,plan.created_at
    )
  ]);
  return {inserted:true};
}


export async function handleBrainProposalRequest(request, env) {
  const url=new URL(request.url);
  if (!url.pathname.startsWith('/internal/proposals/')) return null;
  if (!enabled(env.BRAIN_PROPOSAL_API_ENABLED)) return json({error:'not_found'},404);
  if (!env.BRAIN_PROPOSAL_TOKEN) return json({error:'proposal_api_misconfigured'},503);
  if (!constantTimeEqual(bearer(request),env.BRAIN_PROPOSAL_TOKEN)) return json({error:'unauthorized'},401);
  if (request.method!=='POST') return json({error:'method_not_allowed'},405);
  if (!['/internal/proposals/a14','/internal/proposals/validation-plan'].includes(url.pathname)) {
    return json({error:'not_found'},404);
  }

  try {
    const type=request.headers.get('content-type') || '';
    assert(type.toLowerCase().includes('application/json'),'content_type_must_be_json');
    const declared=Number(request.headers.get('content-length') || '0');
    if (declared) assert(declared<=MAX_BODY_BYTES,'proposal_body_too_large');
    const raw=await request.text();
    assert(new TextEncoder().encode(raw).length<=MAX_BODY_BYTES,'proposal_body_too_large');
    const payload=JSON.parse(raw);
    privacyScan(payload);

    if (url.pathname==='/internal/proposals/validation-plan') {
      assert(payload?.schema==='maison.a14-validation-plan.v1','unsupported_validation_plan_schema');
      validateValidationPlan(payload.plan);
      const result=await persistValidationPlan(env,payload.plan);
      return json({
        stored:true,
        idempotent:!result.inserted,
        validation_plan_id:payload.plan.validation_plan_id,
        plan_kind:payload.plan.plan_kind,
        state:payload.plan.state,
        public_write_authorized:false,
        outbound_authorized:false,
        spend_authorized:false,
        experiment_execution_authorized:false
      });
    }

    assert(payload?.schema==='maison.a14-materialize.v1','unsupported_proposal_schema');
    validateOpportunity(payload.opportunity);
    const offers=assertArray(payload.offer_hypotheses ?? [],'invalid_offer_hypotheses',MAX_OFFERS);
    offers.forEach(x=>validateOffer(x,payload.opportunity.opportunity_id));
    const offerIds=new Set(offers.map(x=>x.offer_hypothesis_id));
    const matches=assertArray(payload.distribution_matches ?? [],'invalid_distribution_matches',MAX_MATCHES);
    matches.forEach(x=>validateMatch(x,offerIds));
    const queueForHuman=payload.queue_for_human===true;
    assert(payload.queue_for_human===true || payload.queue_for_human===false,'queue_for_human_required');
    const reviews=assertArray(payload.a12_review_payloads ?? [],'invalid_a12_reviews',MAX_OFFERS);
    reviews.forEach(x=>validateReview(x,payload.opportunity.opportunity_id,offerIds));
    if (queueForHuman) assert(reviews.length===offers.length,'every_offer_requires_a12_review');
    else assert(reviews.length===0,'analysis_only_proposal_cannot_create_human_reviews');

    const hypothesisStatements=await preflight(env,payload.opportunity,offers,matches);
    const now=new Date().toISOString();
    const governance=await reviewStatements(env,payload.opportunity,reviews,now);
    const statements=[...hypothesisStatements,...governance.inserts,...governance.links];

    if (statements.length) await env.GROWTH_DB.batch(statements);

    return json({
      stored:true,
      mode:queueForHuman ? 'analysis_and_human_review_only' : 'analysis_only',
      opportunity_id:payload.opportunity.opportunity_id,
      offer_hypotheses:offers.length,
      distribution_matches:matches.length,
      human_reviews:reviews.length,
      inserted_statements:statements.length,
      outbound_authorized:false,
      spend_authorized:false,
      public_write_authorized:false,
      experiment_authorized:false
    });
  } catch (error) {
    const message=error?.message || 'invalid_proposal';
    if (message.includes('constraint') || message.includes('FOREIGN KEY')) {
      console.error('Proposal database constraint',message);
      return json({error:'proposal_reference_or_constraint_failed'},409);
    }
    if (message.endsWith('_drift')) return json({error:message},409);
    if (message.startsWith('proposal_privacy_')) return json({error:message},400);
    if (message==='Unexpected end of JSON input' || message.includes('JSON')) return json({error:'invalid_json'},400);
    return json({error:message},400);
  }
}
