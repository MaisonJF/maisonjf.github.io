import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handleBrainProposalRequest } from '../src/proposal_api.js';

function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value==='object') {
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function sha(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
function stableId(prefix,payload) {
  return prefix+sha(payload).slice(0,36);
}

const PLAN='vpl_'+'1'.repeat(36);
const OPP='opp_'+'2'.repeat(36);
const OFFER='ofh_'+'3'.repeat(36);
const DEC='dec_'+'4'.repeat(36);
const RULE='rul_'+'5'.repeat(36);
const CONTROL='sol_'+'6'.repeat(36);
const TREAT='sol_'+'7'.repeat(36);
const ASSET='ast_'+'8'.repeat(36);

class FakeStatement {
  constructor(db,sql){ this.db=db; this.sql=sql; this.params=[]; }
  bind(...params){ this.params=params; return this; }
  async all(){ return {results:this.db.select(this.sql,this.params)}; }
}

class FakeDB {
  constructor(){
    this.tables={
      a14_validation_plans:new Map([[PLAN,{
        validation_plan_id:PLAN,review_resolution_id:'rvr_'+'9'.repeat(36),
        opportunity_id:OPP,offer_hypothesis_id:OFFER,
        plan_kind:'a8_cta_existing_solution',existing_solution_id:TREAT,
        a7_decision_id:null,a8_experiment_id:null,
        hypothesis:'Routing this CTA to the approved solution may improve observed economic value safely.',
        validation_mode:'cta_test',primary_metric_key:'economic_value_per_eligible_session',
        evidence_refs_json:'["evd_plan"]',reason_codes_json:'["a8_requires_canonical_a7_test_cta_decision"]',
        state:'blocked_needs_a7_decision',public_write_authorized:0,outbound_authorized:0,
        spend_authorized:0,experiment_execution_authorized:0,created_at:'2026-09-23T20:00:00Z'
      }]]),
      decision_records:new Map([[DEC,{
        decision_id:DEC,decision_type:'test_cta',hard_gates_passed:1,
        recommended_solution_id:TREAT,rule_version_id:RULE,model_version_id:null
      }]]),
      experiments:new Map(),
      experiment_versions:new Map(),
      experiment_variants:new Map(),
      experiment_state_events:new Map(),
      a14_validation_plan_a7_links:new Map(),
      a14_validation_plan_a8_links:new Map(),
      a14_experiment_links:new Map()
    };
  }
  prepare(sql){ return new FakeStatement(this,sql); }
  select(sql,params){
    if (/FROM experiment_variants WHERE experiment_version_id=\?/i.test(sql)) {
      return [...this.tables.experiment_variants.values()]
        .filter(x=>x.experiment_version_id===params[0])
        .sort((a,b)=>a.variant_key.localeCompare(b.variant_key));
    }
    if (/FROM a14_validation_plan_a7_links/i.test(sql)) {
      const row=[...this.tables.a14_validation_plan_a7_links.values()]
        .find(x=>x.validation_plan_id===params[0] && x.decision_id===params[1]);
      return row?[{...row}]:[];
    }
    if (/FROM a14_validation_plan_a8_links/i.test(sql)) {
      const row=[...this.tables.a14_validation_plan_a8_links.values()]
        .find(x=>x.validation_plan_id===params[0] && x.experiment_version_id===params[1]);
      return row?[{...row}]:[];
    }
    if (/FROM a14_experiment_links WHERE experiment_version_id=\?/i.test(sql)) {
      const row=[...this.tables.a14_experiment_links.values()]
        .find(x=>x.experiment_version_id===params[0]);
      return row?[{...row}]:[];
    }
    const m=sql.match(/SELECT \* FROM\s+([a-z0-9_]+)\s+WHERE\s+([a-z0-9_]+)=\?/i);
    if (!m) return [];
    const [,table,col]=m;
    const values=[...(this.tables[table]?.values()||[])];
    const row=values.find(x=>String(x[col])===String(params[0]));
    return row?[{...row}]:[];
  }
  async batch(statements){
    for(const stmt of statements) this.apply(stmt.sql,stmt.params);
    return statements.map(()=>({success:true}));
  }
  apply(sql,p){
    if (/INSERT INTO experiments\(/i.test(sql)) {
      this.tables.experiments.set(p[0],{
        experiment_id:p[0],experiment_key:p[1],created_at:p[2],created_by:p[3],public_side_effects:0
      }); return;
    }
    if (/INSERT INTO experiment_versions/i.test(sql)) {
      this.tables.experiment_versions.set(p[0],{
        experiment_version_id:p[0],experiment_id:p[1],version_number:p[2],decision_id:p[3],
        hypothesis:p[4],change_class:'cta_route_existing_solution',eligible_population_json:p[5],
        primary_metric_key:p[6],secondary_metrics_json:p[7],stop_rules_json:p[8],
        success_criteria_json:p[9],split_json:p[10],compatibility_key:p[11],policy_version:p[12],
        rule_version_id:p[13],model_version_id:p[14],input_hash:p[15],created_at:p[16]
      }); return;
    }
    if (/INSERT INTO experiment_variants/i.test(sql)) {
      this.tables.experiment_variants.set(p[0],{
        experiment_variant_id:p[0],experiment_version_id:p[1],variant_key:p[2],
        allocation_basis_points:p[3],variant_payload_json:p[4],payload_hash:p[5],created_at:p[6]
      }); return;
    }
    if (/INSERT INTO experiment_state_events/i.test(sql)) {
      this.tables.experiment_state_events.set(p[0],{
        state_event_id:p[0],experiment_version_id:p[1],from_state:null,to_state:'draft',
        reason_code:p[2],occurred_at:p[3],actor_kind:p[4],details_json:p[5]
      }); return;
    }
    if (/INSERT INTO a14_validation_plan_a7_links/i.test(sql)) {
      const key=p[0]+'|'+p[1];
      this.tables.a14_validation_plan_a7_links.set(key,{
        validation_plan_id:p[0],decision_id:p[1],evidence_refs_json:p[2],linked_at:p[3]
      }); return;
    }
    if (/INSERT INTO a14_validation_plan_a8_links/i.test(sql)) {
      const key=p[0]+'|'+p[2];
      this.tables.a14_validation_plan_a8_links.set(key,{
        validation_plan_id:p[0],experiment_id:p[1],experiment_version_id:p[2],
        evidence_refs_json:p[3],linked_at:p[4]
      }); return;
    }
    if (/INSERT INTO a14_experiment_links/i.test(sql)) {
      this.tables.a14_experiment_links.set(p[0],{
        experiment_link_id:p[0],opportunity_id:p[1],offer_hypothesis_id:p[2],
        distribution_match_id:null,experiment_id:p[3],experiment_version_id:p[4],
        linkage_kind:'cta_validation',evidence_refs_json:p[5],linked_at:p[6]
      }); return;
    }
    throw new Error('unhandled fake insert: '+sql);
  }
}

function env(db=new FakeDB()){
  return {
    BRAIN_PROPOSAL_API_ENABLED:'true',
    BRAIN_PROPOSAL_TOKEN:'proposal-secret',
    GROWTH_DB:db,
    db
  };
}

function draftPayload({treatment=TREAT}={}){
  const variants=[
    {variant_key:'control',allocation_basis_points:8000,variant_payload:{destination_solution_id:CONTROL}},
    {variant_key:'variant_a',allocation_basis_points:2000,variant_payload:{destination_solution_id:treatment}}
  ];
  const identity={
    validation_plan_id:PLAN,
    decision_id:DEC,
    definition:{
      hypothesis:'Routing this CTA to the approved solution may improve observed economic value safely.',
      eligible_population:{source_asset_id:ASSET,cta_slot_key:'primary'},
      primary_metric:'economic_value_per_eligible_session',
      secondary_metrics:['cta_click_rate','conversion_rate'],
      stop_rules:{min_exposures:100,max_exposures:500,worse_guardrail_bps:1000},
      success_criteria:{neutral_band_bps:200},
      compatibility_key:`asset:${ASSET}:cta:primary`,
      variants:variants.map(v=>({
        key:v.variant_key,allocation_basis_points:v.allocation_basis_points,payload:v.variant_payload
      })),
      policy_version:'experiment_policy_1'
    }
  };
  const experimentId=stableId('exp_',identity);
  const versionId=stableId('exv_',{experiment_id:experimentId,version:1,identity});
  const outVariants=variants.map(v=>({
    experiment_variant_id:stableId('var_',{
      experiment_version_id:versionId,variant_key:v.variant_key,payload:v.variant_payload
    }),
    ...v,payload_hash:sha(v.variant_payload)
  }));
  return {
    schema:'maison.a8-draft.v1',
    validation_plan_id:PLAN,
    a7_decision_id:DEC,
    experiment:{
      experiment_id:experimentId,
      experiment_key:'a14-'+experimentId.slice(4),
      created_by:'maison_brain_planner',
      public_side_effects:false
    },
    version:{
      experiment_version_id:versionId,version_number:1,decision_id:DEC,
      hypothesis:identity.definition.hypothesis,
      change_class:'cta_route_existing_solution',
      eligible_population:identity.definition.eligible_population,
      primary_metric_key:identity.definition.primary_metric,
      secondary_metrics:identity.definition.secondary_metrics,
      stop_rules:identity.definition.stop_rules,
      success_criteria:identity.definition.success_criteria,
      split:{control:8000,variant_a:2000},
      compatibility_key:identity.definition.compatibility_key,
      policy_version:'experiment_policy_1',
      rule_version_id:RULE,model_version_id:null,input_hash:sha(identity)
    },
    variants:outVariants,
    state:{
      state_event_id:stableId('xst_',{experiment_version_id:versionId,to_state:'draft'}),
      from_state:null,to_state:'draft',reason_code:'approved_validation_plan_drafted',
      actor_kind:'system_simulation',
      details:{validation_plan_id:PLAN,a7_decision_id:DEC,source_asset_id:ASSET,cta_slot_key:'primary'}
    },
    evidence_refs:['evd_plan','evd_a7','manual:cta-map'],
    public_write_authorized:false,
    experiment_execution_authorized:false
  };
}

function request(payload){
  return new Request('https://worker.example/internal/proposals/a8-draft',{
    method:'POST',
    headers:{Authorization:'Bearer proposal-secret','Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
}

test('A8 draft persists experiment lineage but never executes', async()=>{
  const e=env();
  const payload=draftPayload();
  const response=await handleBrainProposalRequest(request(payload),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.state,'draft');
  assert.equal(body.public_write_authorized,false);
  assert.equal(body.experiment_execution_authorized,false);
  assert.equal(e.db.tables.experiments.size,1);
  assert.equal(e.db.tables.experiment_versions.size,1);
  assert.equal(e.db.tables.experiment_variants.size,2);
  assert.equal(e.db.tables.experiment_state_events.size,1);
  assert.equal(e.db.tables.a14_validation_plan_a7_links.size,1);
  assert.equal(e.db.tables.a14_validation_plan_a8_links.size,1);
  assert.equal(e.db.tables.a14_experiment_links.size,1);
});

test('A8 draft persistence is idempotent only with complete lineage', async()=>{
  const e=env();
  const payload=draftPayload();
  let response=await handleBrainProposalRequest(request(payload),e);
  assert.equal(response.status,200);
  response=await handleBrainProposalRequest(request(payload),e);
  assert.equal(response.status,200);
  assert.equal((await response.json()).idempotent,true);
  assert.equal(e.db.tables.experiments.size,1);
});

test('A8 draft rejects treatment that does not match approved validation plan', async()=>{
  const e=env();
  const other='sol_'+'a'.repeat(36);
  const response=await handleBrainProposalRequest(request(draftPayload({treatment:other})),e);
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'a8_treatment_solution_mismatch');
});

test('A8 draft rejects execution authority', async()=>{
  const payload=draftPayload();
  payload.experiment_execution_authorized=true;
  const response=await handleBrainProposalRequest(request(payload),env());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'a8_execution_forbidden');
});

test('A8 draft rejects tampered hash or identity', async()=>{
  const payload=draftPayload();
  payload.version.input_hash='f'.repeat(64);
  const response=await handleBrainProposalRequest(request(payload),env());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'a8_input_hash_mismatch');
});
