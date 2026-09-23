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
