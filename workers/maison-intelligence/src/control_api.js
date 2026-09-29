function enabled(value) {
  return String(value ?? '').toLowerCase() === 'true';
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

function tokenFrom(request) {
  const raw=request.headers.get('Authorization') || '';
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
}

function parseLimit(url) {
  const raw=url.searchParams.get('limit') ?? '50';
  if (!/^\d{1,3}$/.test(raw)) throw new Error('invalid_limit');
  const n=Number(raw);
  if (n < 1 || n > 100) throw new Error('invalid_limit');
  return n;
}

function parseAfter(url) {
  const raw=url.searchParams.get('after');
  if (!raw) return null;
  if (raw.length > 80 || Number.isNaN(Date.parse(raw))) throw new Error('invalid_after');
  return new Date(raw).toISOString();
}

function parseAfterId(url, prefix) {
  const raw=url.searchParams.get('after_id');
  if (!raw) return '';
  if (raw.length !== 40 || !raw.startsWith(prefix)) throw new Error('invalid_after_id');
  return raw;
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const value=JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function all(statement) {
  const out=await statement.all();
  return Array.isArray(out?.results) ? out.results : [];
}

async function feed(env, url) {
  const limit=parseLimit(url);
  const after=parseAfter(url);
  const afterId=parseAfterId(url,'obs_');
  let statement;
  if (after) {
    statement=env.GROWTH_DB.prepare(`
      SELECT observation_id,event_id,territory_key,provider_id,model_id,source_class,
             grounding_state,response_excerpt,observed_at,evidence_id,strength,
             confidence_class,confidence,semantic_observation_id,need_id,intent_id,
             semantic_confidence_score,semantic_ambiguity,semantic_provider_name,
             semantic_provider_version,independent_roots_json,evidence_refs_json
      FROM brain_prebrain_feed
      WHERE observed_at > ? OR (observed_at = ? AND observation_id > ?)
      ORDER BY observed_at,observation_id
      LIMIT ?
    `).bind(after,after,afterId,limit);
  } else {
    statement=env.GROWTH_DB.prepare(`
      SELECT observation_id,event_id,territory_key,provider_id,model_id,source_class,
             grounding_state,response_excerpt,observed_at,evidence_id,strength,
             confidence_class,confidence,semantic_observation_id,need_id,intent_id,
             semantic_confidence_score,semantic_ambiguity,semantic_provider_name,
             semantic_provider_version,independent_roots_json,evidence_refs_json
      FROM brain_prebrain_feed
      ORDER BY observed_at,observation_id
      LIMIT ?
    `).bind(limit);
  }
  const rows=(await all(statement)).map(row=>({
    ...row,
    independent_roots:parseJsonArray(row.independent_roots_json),
    evidence_refs:parseJsonArray(row.evidence_refs_json),
    independent_roots_json:undefined,
    evidence_refs_json:undefined
  }));
  const last=rows.at(-1);
  return json({
    kind:'brain_prebrain_feed',
    rows,
    next_cursor:last ? { after:last.observed_at, after_id:last.observation_id } : null
  });
}

async function cashFeedback(env, url) {
  const limit=parseLimit(url);
  const after=parseAfter(url);
  const afterId=parseAfterId(url,'eva_');
  const fields=`
    conversion_id,economic_assessment_id,economics_version_id,solution_id,conversion_kind,
    occurred_at,assessment_created_at,revenue_minor,currency,variable_cost_minor,
    human_effort_minutes,human_effort_cost_minor,immediate_contribution_minor,
    continuation_expected_value_minor,expected_total_value_minor,scalability_score,
    repeatability_class,confidence_class,calculation_version,
    opportunity_ids_json,offer_hypothesis_ids_json,distribution_match_ids_json
  `;
  let statement;
  if (after) {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM brain_cash_feedback
      WHERE assessment_created_at > ?
         OR (assessment_created_at = ? AND economic_assessment_id > ?)
      ORDER BY assessment_created_at,economic_assessment_id
      LIMIT ?
    `).bind(after,after,afterId,limit);
  } else {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM brain_cash_feedback
      ORDER BY assessment_created_at,economic_assessment_id
      LIMIT ?
    `).bind(limit);
  }
  const rows=(await all(statement)).map(row=>({
    ...row,
    opportunity_ids:parseJsonArray(row.opportunity_ids_json),
    offer_hypothesis_ids:parseJsonArray(row.offer_hypothesis_ids_json),
    distribution_match_ids:parseJsonArray(row.distribution_match_ids_json),
    opportunity_ids_json:undefined,
    offer_hypothesis_ids_json:undefined,
    distribution_match_ids_json:undefined
  }));
  const last=rows.at(-1);
  return json({
    kind:'brain_cash_feedback',
    rows,
    next_cursor:last
      ? { after:last.assessment_created_at, after_id:last.economic_assessment_id }
      : null
  });
}

async function b2bFeedback(env, url) {
  const limit=parseLimit(url);
  const after=parseAfter(url);
  const afterId=parseAfterId(url,'cnv_');
  const fields=`
    conversion_id,source_event_id,event_type,conversion_kind,journey_id,solution_id,
    occurred_at,revenue_minor,currency,privacy_class,lifecycle_stage,interest,origin,
    business,goal,gap,client,model,scale,start,result_type,b2b_stage,offer_family,
    recurrence_type
  `;
  let statement;
  if (after) {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM brain_b2b_feedback
      WHERE occurred_at > ? OR (occurred_at = ? AND conversion_id > ?)
      ORDER BY occurred_at,conversion_id
      LIMIT ?
    `).bind(after,after,afterId,limit);
  } else {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM brain_b2b_feedback
      ORDER BY occurred_at,conversion_id
      LIMIT ?
    `).bind(limit);
  }
  const rows=await all(statement);
  const last=rows.at(-1);
  return json({
    kind:'brain_b2b_feedback',
    rows,
    next_cursor:last ? { after:last.occurred_at, after_id:last.conversion_id } : null
  });
}

async function contentPerformance(env, url) {
  const limit=parseLimit(url);
  const after=parseAfter(url);
  const afterId=parseAfterId(url,'evt_');
  let statement;
  const select=`
    SELECT
      e.event_id,e.payload_hash,e.occurred_at,e.source,e.event_type,e.privacy_class,e.metadata_json,
      (
        SELECT COUNT(DISTINCT json_extract(prior.metadata_json,'$.source_refs_hash'))
        FROM events prior
        WHERE prior.source='maison-content-distribution'
          AND prior.event_type='content.performance_observed'
          AND json_extract(prior.metadata_json,'$.content_id')=json_extract(e.metadata_json,'$.content_id')
          AND json_extract(prior.metadata_json,'$.source_refs_hash') IS NOT NULL
          AND json_extract(prior.metadata_json,'$.source_refs_hash')<>''
          AND (
            prior.occurred_at < e.occurred_at
            OR (prior.occurred_at = e.occurred_at AND prior.event_id <= e.event_id)
          )
      ) AS independent_snapshot_count
    FROM events e
    WHERE e.source='maison-content-distribution'
      AND e.event_type='content.performance_observed'
  `;
  if (after) {
    statement=env.GROWTH_DB.prepare(select+`
      AND (e.occurred_at > ? OR (e.occurred_at = ? AND e.event_id > ?))
      ORDER BY e.occurred_at,e.event_id
      LIMIT ?
    `).bind(after,after,afterId,limit);
  } else {
    statement=env.GROWTH_DB.prepare(select+`
      ORDER BY e.occurred_at,e.event_id
      LIMIT ?
    `).bind(limit);
  }
  const rows=(await all(statement)).map(row=>({
    event_id:row.event_id,
    payload_hash:row.payload_hash,
    occurred_at:row.occurred_at,
    source:row.source,
    event_type:row.event_type,
    privacy_class:row.privacy_class,
    metadata:row.metadata_json ? JSON.parse(row.metadata_json) : {},
    independent_snapshot_count:Number(row.independent_snapshot_count||1)
  }));
  const last=rows.at(-1);
  return json({
    kind:'brain_content_performance',
    rows,
    next_cursor:last ? { after:last.occurred_at, after_id:last.event_id } : null
  });
}

async function learningSubject(env, url) {
  const limit=parseLimit(url);
  const subjectId=url.searchParams.get('subject_id') || '';
  if (subjectId.length!==40 || !subjectId.startsWith('can_')) throw new Error('invalid_subject_id');
  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT learning_record_id,source_kind,source_id,subject_type,subject_id,signal_class,
           economic_value_minor,ctr_bps,confidence_before,confidence_after,confidence_delta,
           reason_codes_json,evidence_refs_json,correlation_only,causal_claim,created_at
    FROM learning_records
    WHERE subject_type='candidate' AND subject_id=?
    ORDER BY created_at DESC,learning_record_id DESC
    LIMIT ?
  `).bind(subjectId,limit));
  return json({
    kind:'brain_learning_subject',
    subject_id:subjectId,
    rows:rows.map(row=>({
      ...row,
      reason_codes:parseJsonArray(row.reason_codes_json),
      evidence_refs:parseJsonArray(row.evidence_refs_json),
      reason_codes_json:undefined,
      evidence_refs_json:undefined,
      correlation_only:Number(row.correlation_only)===1,
      causal_claim:Number(row.causal_claim)===1
    }))
  });
}

async function learningContext(env, url) {
  const limit=parseLimit(url);
  const after=parseAfter(url);
  const afterId=parseAfterId(url,'lrn_');
  const fields=`
    learning_record_id,source_kind,source_id,subject_type,subject_id,signal_class,
    economic_value_minor,ctr_bps,confidence_before,confidence_after,confidence_delta,
    reason_codes_json,evidence_refs_json,correlation_only,causal_claim,created_at
  `;
  let statement;
  if (after) {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM learning_records
      WHERE created_at > ? OR (created_at = ? AND learning_record_id > ?)
      ORDER BY created_at,learning_record_id
      LIMIT ?
    `).bind(after,after,afterId,limit);
  } else {
    statement=env.GROWTH_DB.prepare(`
      SELECT ${fields}
      FROM learning_records
      ORDER BY created_at,learning_record_id
      LIMIT ?
    `).bind(limit);
  }
  const rows=(await all(statement)).map(row=>({
    ...row,
    reason_codes:parseJsonArray(row.reason_codes_json),
    evidence_refs:parseJsonArray(row.evidence_refs_json),
    reason_codes_json:undefined,
    evidence_refs_json:undefined,
    correlation_only:Number(row.correlation_only)===1,
    causal_claim:Number(row.causal_claim)===1
  }));
  const last=rows.at(-1);
  return json({
    kind:'brain_learning_context',
    rows,
    next_cursor:last ? { after:last.created_at, after_id:last.learning_record_id } : null
  });
}

async function reviewQueue(env, url) {
  const limit=parseLimit(url);
  const status=url.searchParams.get('status') || 'pending';
  if (!['pending','approved','rejected','expired'].includes(status)) throw new Error('invalid_review_status');

  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT
      q.queue_id,q.action_id,q.priority,q.effective_status AS status,q.created_at,
      q.review_resolution_id,q.approved_scope,q.decision_reason,q.decided_at,
      a.action_key,a.risk_class,a.autonomy_level,a.evidence_refs_json,a.reason_codes_json,
      g.opportunity_id,
      o.territory_code,o.opportunity_score,o.confidence,o.status AS opportunity_status,
      json_extract(a.result_json,'$.offer_hypothesis_id') AS offer_hypothesis_id,
      h.offer_type,h.a3_solution_type,h.existing_solution_id,h.fit_score,h.fit_confidence,
      h.economics_json,h.validation_mode
    FROM autonomy_human_queue_current q
    JOIN autonomy_action_log a ON a.action_id=q.action_id
    LEFT JOIN a14_governance_links g ON g.action_id=a.action_id
    LEFT JOIN opportunity_hypotheses o ON o.opportunity_id=g.opportunity_id
    LEFT JOIN opportunity_offer_hypotheses h
      ON h.offer_hypothesis_id=json_extract(a.result_json,'$.offer_hypothesis_id')
    WHERE q.effective_status=? AND a.action_key='commercial_opportunity_review'
    ORDER BY q.priority DESC,q.created_at,q.queue_id
    LIMIT ?
  `).bind(status,limit));

  return json({
    kind:'brain_commercial_review_queue',
    status,
    rows:rows.map(row=>({
      queue_id:row.queue_id,
      action_id:row.action_id,
      priority:row.priority,
      status:row.status,
      created_at:row.created_at,
      risk_class:row.risk_class,
      autonomy_level:row.autonomy_level,
      review_resolution_id:row.review_resolution_id,
      approved_scope:row.approved_scope,
      decision_reason:row.decision_reason,
      decided_at:row.decided_at,
      opportunity_id:row.opportunity_id,
      territory_code:row.territory_code,
      opportunity_score:row.opportunity_score,
      opportunity_confidence:row.confidence,
      opportunity_status:row.opportunity_status,
      offer_hypothesis_id:row.offer_hypothesis_id,
      offer_type:row.offer_type,
      a3_solution_type:row.a3_solution_type,
      existing_solution_id:row.existing_solution_id,
      fit_score:row.fit_score,
      fit_confidence:row.fit_confidence,
      economics:row.economics_json ? JSON.parse(row.economics_json) : {},
      validation_mode:row.validation_mode,
      evidence_refs:parseJsonArray(row.evidence_refs_json),
      reason_codes:parseJsonArray(row.reason_codes_json),
      public_write_authorized:false,
      outbound_authorized:false,
      spend_authorized:false,
      experiment_execution_authorized:false
    }))
  });
}

async function approvedValidations(env, url) {
  const limit=parseLimit(url);
  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT review_resolution_id,queue_id,action_id,opportunity_id,offer_hypothesis_id,
           territory_code,opportunity_score,opportunity_confidence,offer_type,a3_solution_type,
           existing_solution_id,fit_score,fit_confidence,validation_mode,economics_json,
           evidence_refs_json,reason_codes_json,decided_at
    FROM a14_approved_offers_ready_for_planning
    ORDER BY decided_at,review_resolution_id
    LIMIT ?
  `).bind(limit));
  return json({
    kind:'brain_approved_validations',
    rows:rows.map(row=>({
      ...row,
      economics:row.economics_json ? JSON.parse(row.economics_json) : {},
      evidence_refs:parseJsonArray(row.evidence_refs_json),
      reason_codes:parseJsonArray(row.reason_codes_json),
      economics_json:undefined,
      evidence_refs_json:undefined,
      reason_codes_json:undefined
    }))
  });
}

async function validationPlans(env, url) {
  const limit=parseLimit(url);
  const state=url.searchParams.get('state');
  const allowed=['planning','blocked_needs_a7_decision','ready_for_a8_draft','manual_pilot_required','rejected'];
  if (state && !allowed.includes(state)) throw new Error('invalid_validation_state');
  const sql=`
    SELECT p.validation_plan_id,p.review_resolution_id,p.opportunity_id,p.offer_hypothesis_id,
           p.plan_kind,p.existing_solution_id,p.a7_decision_id,p.a8_experiment_id,p.hypothesis,
           p.validation_mode,p.primary_metric_key,p.evidence_refs_json,p.reason_codes_json,p.state,
           p.created_at,o.territory_code,o.opportunity_score,o.confidence AS opportunity_confidence,
           h.offer_type,h.a3_solution_type,h.fit_score,h.fit_confidence,h.economics_json
    FROM a14_validation_plans p
    JOIN opportunity_hypotheses o ON o.opportunity_id=p.opportunity_id
    JOIN opportunity_offer_hypotheses h ON h.offer_hypothesis_id=p.offer_hypothesis_id
    ${state ? 'WHERE p.state=?' : ''}
    ORDER BY p.created_at,p.validation_plan_id
    LIMIT ?
  `;
  const stmt=state
    ? env.GROWTH_DB.prepare(sql).bind(state,limit)
    : env.GROWTH_DB.prepare(sql).bind(limit);
  const rows=(await all(stmt)).map(row=>({
    ...row,
    evidence_refs:parseJsonArray(row.evidence_refs_json),
    reason_codes:parseJsonArray(row.reason_codes_json),
    economics:row.economics_json ? JSON.parse(row.economics_json) : {},
    evidence_refs_json:undefined,
    reason_codes_json:undefined,
    economics_json:undefined,
    public_write_authorized:false,
    outbound_authorized:false,
    spend_authorized:false,
    experiment_execution_authorized:false
  }));
  return json({kind:'brain_validation_plans',state:state||null,rows});
}

async function a7Decisions(env, url) {
  const limit=parseLimit(url);
  const solutionId=url.searchParams.get('solution_id');
  if (!solutionId || solutionId.length!==40 || !solutionId.startsWith('sol_')) {
    throw new Error('invalid_solution_id');
  }
  const rows=await all(env.GROWTH_DB.prepare(`
    SELECT decision_id,subject_type,subject_id,decision_type,hard_gates_passed,
           discovery_score,commercial_score,confidence_score,reason_codes_json,
           evidence_refs_json,recommended_solution_id,rule_version_id,model_version_id,created_at
    FROM decision_records
    WHERE decision_type='test_cta'
      AND hard_gates_passed=1
      AND recommended_solution_id=?
    ORDER BY created_at DESC,decision_id DESC
    LIMIT ?
  `).bind(solutionId,limit));
  return json({
    kind:'brain_a7_test_cta_decisions',
    solution_id:solutionId,
    rows:rows.map(row=>({
      ...row,
      reason_codes:parseJsonArray(row.reason_codes_json),
      evidence_refs:parseJsonArray(row.evidence_refs_json),
      reason_codes_json:undefined,
      evidence_refs_json:undefined,
      hard_gates_passed:Number(row.hard_gates_passed)===1,
      public_side_effects:false
    }))
  });
}

async function commercialActionInbox(env, url) {
  const limit=parseLimit(url);

  const decisions=await all(env.GROWTH_DB.prepare(`
    SELECT
      q.queue_id,q.action_id,q.priority,q.effective_status AS status,q.created_at,
      a.risk_class,a.autonomy_level,g.opportunity_id,
      json_extract(a.result_json,'$.offer_hypothesis_id') AS offer_hypothesis_id,
      o.territory_code,o.opportunity_score,o.confidence AS opportunity_confidence,
      h.offer_type,h.a3_solution_type,h.existing_solution_id,h.fit_score,h.fit_confidence,
      h.validation_mode,h.economics_json
    FROM autonomy_human_queue_current q
    JOIN autonomy_action_log a ON a.action_id=q.action_id
    LEFT JOIN a14_governance_links g ON g.action_id=a.action_id
    LEFT JOIN opportunity_hypotheses o ON o.opportunity_id=g.opportunity_id
    LEFT JOIN opportunity_offer_hypotheses h
      ON h.offer_hypothesis_id=json_extract(a.result_json,'$.offer_hypothesis_id')
    WHERE q.effective_status='pending'
      AND a.action_key='commercial_opportunity_review'
    ORDER BY q.priority DESC,q.created_at,q.queue_id
    LIMIT ?
  `).bind(limit));

  const manualPilots=await all(env.GROWTH_DB.prepare(`
    SELECT
      validation_plan_id,review_resolution_id,opportunity_id,offer_hypothesis_id,
      plan_kind,existing_solution_id,hypothesis,validation_mode,primary_metric_key,
      evidence_refs_json,reason_codes_json,state,created_at
    FROM a14_validation_plans
    WHERE state='manual_pilot_required'
    ORDER BY created_at,validation_plan_id
    LIMIT ?
  `).bind(limit));

  const a8Drafts=await all(env.GROWTH_DB.prepare(`
    SELECT
      p.validation_plan_id,p.opportunity_id,p.offer_hypothesis_id,p.existing_solution_id,
      l.experiment_id,l.experiment_version_id,
      v.hypothesis,v.primary_metric_key,v.compatibility_key,v.policy_version,
      s.to_state AS experiment_state,s.occurred_at
    FROM a14_validation_plan_a8_links l
    JOIN a14_validation_plans p ON p.validation_plan_id=l.validation_plan_id
    JOIN experiment_versions v ON v.experiment_version_id=l.experiment_version_id
    JOIN experiment_state_events s ON s.state_event_id=(
      SELECT s2.state_event_id
      FROM experiment_state_events s2
      WHERE s2.experiment_version_id=l.experiment_version_id
      ORDER BY s2.occurred_at DESC,s2.state_event_id DESC
      LIMIT 1
    )
    WHERE s.to_state='draft'
    ORDER BY s.occurred_at,l.experiment_version_id
    LIMIT ?
  `).bind(limit));

  return json({
    kind:'brain_commercial_action_inbox',
    authority:{
      public_write_authorized:false,
      outbound_authorized:false,
      spend_authorized:false,
      experiment_execution_authorized:false
    },
    decide:decisions.map(row=>({
      ...row,
      economics:row.economics_json ? JSON.parse(row.economics_json) : {},
      economics_json:undefined
    })),
    manual_pilots:manualPilots.map(row=>({
      ...row,
      evidence_refs:parseJsonArray(row.evidence_refs_json),
      reason_codes:parseJsonArray(row.reason_codes_json),
      evidence_refs_json:undefined,
      reason_codes_json:undefined,
      outbound_authorized:false,
      spend_authorized:false,
      public_write_authorized:false
    })),
    a8_drafts:a8Drafts.map(row=>({
      ...row,
      experiment_execution_authorized:false,
      public_write_authorized:false
    }))
  });
}

async function solutions(env, url) {
  const limit=parseLimit(url);
  const status=url.searchParams.get('status');
  if (status && !['planned','active','paused','retired'].includes(status)) throw new Error('invalid_solution_status');
  const now=new Date().toISOString();
  const filter=status ? 'WHERE s.status=?' : '';
  const sql=`
    WITH ranked AS (
      SELECT v.*,
             ROW_NUMBER() OVER (
               PARTITION BY v.solution_id
               ORDER BY v.valid_from DESC,v.created_at DESC,v.economics_version_id DESC
             ) AS rn
      FROM solution_economics_versions v
      WHERE v.valid_from <= ? AND (v.valid_to IS NULL OR v.valid_to > ?)
    )
    SELECT s.solution_id,s.solution_key,s.solution_type,s.delivery_mode,s.capacity_class,s.status,
           r.economics_version_id,r.currency,r.reference_price_minor,r.variable_cost_minor,
           r.human_effort_minutes,r.human_effort_cost_minor,r.continuation_expected_value_minor,
           r.repeatability_class,r.scalability_score,r.capacity_units_per_period,r.confidence_class
    FROM solutions s
    LEFT JOIN ranked r ON r.solution_id=s.solution_id AND r.rn=1
    ${filter}
    ORDER BY s.solution_key
    LIMIT ?
  `;
  const stmt=status
    ? env.GROWTH_DB.prepare(sql).bind(now,now,status,limit)
    : env.GROWTH_DB.prepare(sql).bind(now,now,limit);
  return json({ kind:'brain_solutions', rows:await all(stmt) });
}

async function solutionLinks(env, url) {
  const limit=parseLimit(url);
  const territory=url.searchParams.get('territory_key');
  if (territory && !/^[A-Za-z0-9_-]{1,120}$/.test(territory)) throw new Error('invalid_territory_key');
  const base=`
    SELECT r.relation_id,r.need_id,n.need_key,n.canonical_label,n.territory_key,
           r.solution_id,s.solution_key,s.solution_type,r.relation_role,r.strength,r.status,
           COALESCE((
             SELECT json_group_array(re.evidence_id)
             FROM relation_evidence re
             WHERE re.relation_type='need_solution' AND re.relation_id=r.relation_id
           ),'[]') AS evidence_refs_json
    FROM need_solution_relations r
    JOIN needs n ON n.need_id=r.need_id
    JOIN solutions s ON s.solution_id=r.solution_id
    WHERE r.status IN ('observed','active')
  `;
  const sql=territory
    ? base + ' AND n.territory_key=? ORDER BY r.strength DESC,r.relation_id LIMIT ?'
    : base + ' ORDER BY n.territory_key,r.strength DESC,r.relation_id LIMIT ?';
  const stmt=territory
    ? env.GROWTH_DB.prepare(sql).bind(territory,limit)
    : env.GROWTH_DB.prepare(sql).bind(limit);
  const rows=(await all(stmt)).map(row=>({
    ...row,
    evidence_refs:parseJsonArray(row.evidence_refs_json),
    evidence_refs_json:undefined
  }));
  return json({ kind:'brain_solution_links', rows });
}

export async function handleBrainControlRequest(request, env) {
  const url=new URL(request.url);
  if (!url.pathname.startsWith('/internal/brain/')) return null;
  if (!enabled(env.BRAIN_CONTROL_API_ENABLED)) return json({ error:'not_found' },404);
  if (!env.BRAIN_CONTROL_TOKEN) return json({ error:'control_api_misconfigured' },503);
  if (!constantTimeEqual(tokenFrom(request),env.BRAIN_CONTROL_TOKEN)) return json({ error:'unauthorized' },401);
  if (request.method !== 'GET') return json({ error:'method_not_allowed' },405);

  try {
    if (url.pathname === '/internal/brain/feed') return await feed(env,url);
    if (url.pathname === '/internal/brain/cash-feedback') return await cashFeedback(env,url);
    if (url.pathname === '/internal/brain/b2b-feedback') return await b2bFeedback(env,url);
    if (url.pathname === '/internal/brain/content-performance') return await contentPerformance(env,url);
    if (url.pathname === '/internal/brain/learning-subject') return await learningSubject(env,url);
    if (url.pathname === '/internal/brain/learning') return await learningContext(env,url);
    if (url.pathname === '/internal/brain/review-queue') return await reviewQueue(env,url);
    if (url.pathname === '/internal/brain/approved-validations') return await approvedValidations(env,url);
    if (url.pathname === '/internal/brain/validation-plans') return await validationPlans(env,url);
    if (url.pathname === '/internal/brain/a7-decisions') return await a7Decisions(env,url);
    if (url.pathname === '/internal/brain/action-inbox') return await commercialActionInbox(env,url);
    if (url.pathname === '/internal/brain/solutions') return await solutions(env,url);
    if (url.pathname === '/internal/brain/solution-links') return await solutionLinks(env,url);
    if (url.pathname === '/internal/brain/health') return json({ status:'ok',mode:'read_only' });
    return json({ error:'not_found' },404);
  } catch (error) {
    const message=error?.message || 'bad_request';
    if (String(message).startsWith('invalid_')) return json({ error:message },400);
    console.error('Brain control API error',message);
    return json({ error:'internal_error' },500);
  }
}
