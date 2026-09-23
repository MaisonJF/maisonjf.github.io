import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBrainControlRequest } from '../src/control_api.js';

class FakeStatement {
  constructor(sql, handler) { this.sql=sql; this.handler=handler; this.params=[]; }
  bind(...params) { this.params=params; return this; }
  async all() { return { results:this.handler(this.sql,this.params) }; }
}
class FakeDB {
  constructor(handler) { this.handler=handler; this.queries=[]; }
  prepare(sql) {
    const stmt=new FakeStatement(sql,(text,params)=>{
      this.queries.push({sql:text,params});
      return this.handler(text,params);
    });
    return stmt;
  }
}

function req(path,{method='GET',token='secret'}={}) {
  const headers=token ? {Authorization:`Bearer ${token}`} : {};
  return new Request(`https://worker.example${path}`,{method,headers});
}

function env(handler=()=>[]) {
  return {
    BRAIN_CONTROL_API_ENABLED:'true',
    BRAIN_CONTROL_TOKEN:'secret',
    GROWTH_DB:new FakeDB(handler)
  };
}

test('control API is hidden when disabled', async () => {
  const response=await handleBrainControlRequest(req('/internal/brain/health'),{
    BRAIN_CONTROL_API_ENABLED:'false',
    BRAIN_CONTROL_TOKEN:'secret'
  });
  assert.equal(response.status,404);
});

test('control API requires bearer token', async () => {
  const response=await handleBrainControlRequest(req('/internal/brain/health',{token:''}),env());
  assert.equal(response.status,401);
  assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');
});

test('control API is GET-only', async () => {
  const response=await handleBrainControlRequest(req('/internal/brain/health',{method:'POST'}),env());
  assert.equal(response.status,405);
});

test('feed returns canonical evidence roots and composite cursor', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/FROM brain_prebrain_feed/);
    assert.equal(params.at(-1),25);
    return [{
      observation_id:'obs_12345678-1234-1234-1234-123456789012',
      event_id:'evt_x',
      territory_key:'work',
      provider_id:'eurostat_jobs',
      model_id:null,
      source_class:'public_web',
      grounding_state:'grounded',
      response_excerpt:'aggregate signal',
      observed_at:'2026-09-23T12:00:00.000Z',
      evidence_id:'evd_x',
      strength:80,
      confidence_class:'high',
      confidence:0.8,
      independent_roots_json:'["https://example.org/a"]',
      evidence_refs_json:'["evd_x"]'
    }];
  });
  const response=await handleBrainControlRequest(req('/internal/brain/feed?limit=25'),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.deepEqual(body.rows[0].independent_roots,['https://example.org/a']);
  assert.deepEqual(body.rows[0].evidence_refs,['evd_x']);
  assert.equal(body.next_cursor.after_id,'obs_12345678-1234-1234-1234-123456789012');
  assert.equal('independent_roots_json' in body.rows[0],false);
});

test('cash feedback exposes all A3 economics with optional A14 lineage and no customer identity', async () => {
  const e=env((sql)=>{
    assert.match(sql,/FROM brain_cash_feedback/);
    return [{
      conversion_id:'cnv_12345678-1234-1234-1234-123456789012',
      economic_assessment_id:'eva_12345678-1234-1234-1234-123456789012',
      economics_version_id:'eco_x',solution_id:'sol_x',conversion_kind:'purchase',
      occurred_at:'2026-09-23T12:00:00.000Z',
      assessment_created_at:'2026-09-23T12:01:00.000Z',
      revenue_minor:3500,currency:'EUR',variable_cost_minor:500,
      human_effort_minutes:60,human_effort_cost_minor:300,
      immediate_contribution_minor:2700,continuation_expected_value_minor:null,
      expected_total_value_minor:null,scalability_score:20,
      repeatability_class:'medium',confidence_class:'observed',
      calculation_version:'a3_v1',
      opportunity_ids_json:'["opp_x"]',
      offer_hypothesis_ids_json:'["ofh_x"]',
      distribution_match_ids_json:'[]'
    }];
  });
  const response=await handleBrainControlRequest(req('/internal/brain/cash-feedback'),e);
  const body=await response.json();
  assert.equal(body.rows[0].immediate_contribution_minor,2700);
  assert.deepEqual(body.rows[0].opportunity_ids,['opp_x']);
  assert.deepEqual(body.rows[0].offer_hypothesis_ids,['ofh_x']);
  assert.deepEqual(body.rows[0].distribution_match_ids,[]);
  assert.equal(body.next_cursor.after_id,'eva_12345678-1234-1234-1234-123456789012');
  assert.equal('journey_id' in body.rows[0],false);
  assert.equal('customer_id' in body.rows[0],false);
});

test('solutions expose safe commercial fields and current economics only', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/WITH ranked AS/);
    assert.match(sql,/ROW_NUMBER\(\) OVER/);
    assert.ok(!sql.includes('metadata_json'));
    assert.ok(!sql.includes('created_by'));
    assert.equal(params.at(-1),20);
    return [{
      solution_id:'sol_x',solution_key:'tarot',solution_type:'service',
      delivery_mode:'human',capacity_class:'human_limited',status:'active',
      economics_version_id:'eco_x',currency:'EUR',reference_price_minor:3500,
      variable_cost_minor:0,human_effort_minutes:60,human_effort_cost_minor:0,
      continuation_expected_value_minor:null,repeatability_class:'medium',
      scalability_score:20,capacity_units_per_period:null,confidence_class:'observed'
    }];
  });
  const response=await handleBrainControlRequest(req('/internal/brain/solutions?status=active&limit=20'),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].solution_key,'tarot');
});

test('solution links reuse A4 need-to-solution relations rather than inventing territory fit', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/FROM need_solution_relations/);
    assert.match(sql,/JOIN needs/);
    assert.equal(params[0],'relationships');
    return [{
      relation_id:'rel_x',need_id:'ned_x',need_key:'connection',
      canonical_label:'Ligação',territory_key:'relationships',
      solution_id:'sol_x',solution_key:'consultation',solution_type:'service',
      relation_role:'primary',strength:90,status:'active',
      evidence_refs_json:'["evd_a","evd_b"]'
    }];
  });
  const response=await handleBrainControlRequest(
    req('/internal/brain/solution-links?territory_key=relationships&limit=10'),e
  );
  const body=await response.json();
  assert.deepEqual(body.rows[0].evidence_refs,['evd_a','evd_b']);
  assert.equal('evidence_refs_json' in body.rows[0],false);
});

test('invalid pagination is rejected before D1 query', async () => {
  const response=await handleBrainControlRequest(req('/internal/brain/feed?limit=999'),env());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'invalid_limit');
});


test('learning context remains correlation-only and excludes policy mutation fields', async () => {
  const e=env((sql)=>{
    assert.match(sql,/FROM learning_records/);
    return [{
      learning_record_id:'lrn_12345678-1234-1234-1234-123456789012',
      source_kind:'conversion',
      source_id:'cnv_12345678-1234-1234-1234-123456789012',
      subject_type:'need',
      subject_id:'ned_12345678-1234-1234-1234-123456789012',
      signal_class:'positive',
      economic_value_minor:2700,
      ctr_bps:null,
      confidence_before:60,
      confidence_after:70,
      confidence_delta:10,
      reason_codes_json:'["ECONOMIC_OUTCOME_ABOVE_EXPECTATION"]',
      evidence_refs_json:'["evd_a"]',
      correlation_only:1,
      causal_claim:0,
      created_at:'2026-09-23T16:00:00.000Z'
    }];
  });
  const response=await handleBrainControlRequest(req('/internal/brain/learning?limit=10'),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].correlation_only,true);
  assert.equal(body.rows[0].causal_claim,false);
  assert.deepEqual(body.rows[0].reason_codes,['ECONOMIC_OUTCOME_ABOVE_EXPECTATION']);
  assert.deepEqual(body.rows[0].evidence_refs,['evd_a']);
  assert.equal('expected_json' in body.rows[0],false);
  assert.equal('observed_json' in body.rows[0],false);
  assert.equal('recommendation' in body.rows[0],false);
});


test('commercial review queue exposes actionable context without execution authority', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/FROM autonomy_human_queue_current/);
    assert.match(sql,/commercial_opportunity_review/);
    assert.deepEqual(params,['pending',10]);
    return [{
      queue_id:'inq_12345678-1234-1234-1234-123456789012',
      action_id:'act_12345678-1234-1234-1234-123456789012',
      priority:50,status:'pending',created_at:'2026-09-23T17:00:00Z',
      action_key:'commercial_opportunity_review',risk_class:'medium',
      autonomy_level:'human_approval_required',
      evidence_refs_json:'["evd_x"]',reason_codes_json:'["commercial_human_review_required"]',
      opportunity_id:'opp_12345678-1234-1234-1234-123456789012',
      territory_code:'gifting',opportunity_score:82,confidence:.7,
      opportunity_status:'human_review_required',
      offer_hypothesis_id:'ofh_12345678-1234-1234-1234-123456789012',
      offer_type:'corporate_gifting',a3_solution_type:'b2b',existing_solution_id:null,
      fit_score:75,fit_confidence:.65,
      economics_json:'{"capital_required_minor":1000}',
      validation_mode:'b2b_pilot'
    }];
  });
  const response=await handleBrainControlRequest(
    req('/internal/brain/review-queue?status=pending&limit=10'),e
  );
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].offer_type,'corporate_gifting');
  assert.equal(body.rows[0].economics.capital_required_minor,1000);
  assert.equal(body.rows[0].public_write_authorized,false);
  assert.equal(body.rows[0].outbound_authorized,false);
  assert.equal(body.rows[0].spend_authorized,false);
  assert.equal(body.rows[0].experiment_execution_authorized,false);
});

test('commercial review queue validates status', async () => {
  const response=await handleBrainControlRequest(
    req('/internal/brain/review-queue?status=whatever'),env()
  );
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'invalid_review_status');
});


test('approved validation inbox exposes only planning context', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/FROM a14_approved_offers_ready_for_planning/);
    assert.deepEqual(params,[10]);
    return [{
      review_resolution_id:'rvr_12345678-1234-1234-1234-123456789012',
      queue_id:'inq_12345678-1234-1234-1234-123456789012',
      action_id:'act_12345678-1234-1234-1234-123456789012',
      opportunity_id:'opp_12345678-1234-1234-1234-123456789012',
      offer_hypothesis_id:'ofh_12345678-1234-1234-1234-123456789012',
      territory_code:'gifting',opportunity_score:80,opportunity_confidence:.7,
      offer_type:'corporate_gifting',a3_solution_type:'b2b',existing_solution_id:null,
      fit_score:70,fit_confidence:.6,validation_mode:'b2b_pilot',
      economics_json:'{"capital_required_minor":null}',
      evidence_refs_json:'["evd_x"]',reason_codes_json:'["approved"]',
      decided_at:'2026-09-23T19:00:00Z'
    }];
  });
  const response=await handleBrainControlRequest(
    req('/internal/brain/approved-validations?limit=10'),e
  );
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].offer_type,'corporate_gifting');
  assert.deepEqual(body.rows[0].evidence_refs,['evd_x']);
  assert.equal('economics_json' in body.rows[0],false);
});

test('validation plans remain read-only and execution disabled', async () => {
  const e=env((sql,params)=>{
    assert.match(sql,/FROM a14_validation_plans/);
    assert.deepEqual(params,['manual_pilot_required',10]);
    return [{
      validation_plan_id:'vpl_12345678-1234-1234-1234-123456789012',
      review_resolution_id:'rvr_12345678-1234-1234-1234-123456789012',
      opportunity_id:'opp_12345678-1234-1234-1234-123456789012',
      offer_hypothesis_id:'ofh_12345678-1234-1234-1234-123456789012',
      plan_kind:'manual_b2b_pilot',existing_solution_id:null,
      a7_decision_id:null,a8_experiment_id:null,
      hypothesis:'Pilot validates demand safely.',
      validation_mode:'b2b_pilot',primary_metric_key:null,
      evidence_refs_json:'["evd_x"]',reason_codes_json:'["manual"]',
      state:'manual_pilot_required',created_at:'2026-09-23T19:05:00Z'
    }];
  });
  const response=await handleBrainControlRequest(
    req('/internal/brain/validation-plans?state=manual_pilot_required&limit=10'),e
  );
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].plan_kind,'manual_b2b_pilot');
  assert.equal(body.rows[0].public_write_authorized,false);
  assert.equal(body.rows[0].outbound_authorized,false);
  assert.equal(body.rows[0].spend_authorized,false);
  assert.equal(body.rows[0].experiment_execution_authorized,false);
});

test('validation plan state is validated', async () => {
  const response=await handleBrainControlRequest(
    req('/internal/brain/validation-plans?state=magic'),env()
  );
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'invalid_validation_state');
});


test('A7 CTA decision lookup returns only hard-gated matching solution decisions', async () => {
  const sol='sol_12345678-1234-1234-1234-123456789012';
  const e=env((sql,params)=>{
    assert.match(sql,/FROM decision_records/);
    assert.match(sql,/decision_type='test_cta'/);
    assert.match(sql,/hard_gates_passed=1/);
    assert.deepEqual(params,[sol,5]);
    return [{
      decision_id:'dec_12345678-1234-1234-1234-123456789012',
      subject_type:'solution',subject_id:sol,decision_type:'test_cta',
      hard_gates_passed:1,discovery_score:70,commercial_score:65,
      confidence_score:80,reason_codes_json:'["journey_gap_existing_solution_test"]',
      evidence_refs_json:'["evd_x"]',recommended_solution_id:sol,
      rule_version_id:'rul_12345678-1234-1234-1234-123456789012',
      model_version_id:null,created_at:'2026-09-23T18:00:00Z'
    }];
  });
  const response=await handleBrainControlRequest(
    req('/internal/brain/a7-decisions?solution_id='+encodeURIComponent(sol)+'&limit=5'),e
  );
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.rows[0].decision_type,'test_cta');
  assert.equal(body.rows[0].hard_gates_passed,true);
  assert.equal(body.rows[0].public_side_effects,false);
  assert.deepEqual(body.rows[0].evidence_refs,['evd_x']);
});

test('A7 CTA decision lookup requires stable solution ID', async () => {
  const response=await handleBrainControlRequest(
    req('/internal/brain/a7-decisions?solution_id=bad'),env()
  );
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'invalid_solution_id');
});
