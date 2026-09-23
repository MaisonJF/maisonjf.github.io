import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBrainProposalRequest } from '../src/proposal_api.js';

class FakeStatement {
  constructor(db, sql) { this.db=db; this.sql=sql; this.params=[]; }
  bind(...params) { this.params=params; return this; }
  async all() {
    const m=this.sql.match(/SELECT \* FROM\s+([a-z0-9_]+)\s+WHERE\s+([a-z0-9_]+)=\?/i);
    if (!m) return {results:[]};
    const [,_table,key]=m;
    const row=this.db.tables[_table]?.get(String(this.params[0]));
    return {results:row ? [{...row}] : []};
  }
}

class FakeDB {
  constructor() {
    this.tables={
      opportunity_hypotheses:new Map(),
      opportunity_offer_hypotheses:new Map(),
      earned_distribution_match_assessments:new Map(),
      autonomy_action_log:new Map(),
      autonomy_human_queue:new Map(),
      a14_governance_links:new Map()
    };
    this.batchCalls=[];
  }
  prepare(sql) { return new FakeStatement(this,sql); }
  async batch(statements) {
    this.batchCalls.push(statements.length);
    for (const stmt of statements) this.apply(stmt.sql,stmt.params);
    return statements.map(()=>({success:true}));
  }
  apply(sql,p) {
    if (/INSERT INTO opportunity_hypotheses/i.test(sql)) {
      this.tables.opportunity_hypotheses.set(p[0],{
        opportunity_id:p[0],need_id:p[1],territory_code:p[2],opportunity_score:p[3],confidence:p[4],
        known_dimensions_json:p[5],unknown_dimensions_json:p[6],evidence_refs_json:p[7],
        existing_solution_ids_json:p[8],knowledge_context_refs_json:p[9],status:p[10],
        reason_codes_json:p[11],rule_version_id:p[12],model_version_id:p[13],input_hash:p[14],created_at:p[15]
      }); return;
    }
    if (/INSERT INTO opportunity_offer_hypotheses/i.test(sql)) {
      this.tables.opportunity_offer_hypotheses.set(p[0],{
        offer_hypothesis_id:p[0],opportunity_id:p[1],offer_type:p[2],a3_solution_type:p[3],
        existing_solution_id:p[4],fit_score:p[5],fit_confidence:p[6],economics_json:p[7],
        validation_mode:p[8],evidence_refs_json:p[9],reason_codes_json:p[10],
        human_review_required:1,launch_authorized:0,price_authorized:0,public_side_effects:0,created_at:p[11]
      }); return;
    }
    if (/INSERT INTO earned_distribution_match_assessments/i.test(sql)) {
      this.tables.earned_distribution_match_assessments.set(p[0],{
        distribution_match_id:p[0],offer_hypothesis_id:p[1],amplifier_ref:p[2],moment_key:p[3],
        story_angle_key:p[4],channel_class:p[5],fit_score:p[6],fit_confidence:p[7],
        known_dimensions_json:p[8],unknown_dimensions_json:p[9],evidence_refs_json:p[10],
        economics_json:p[11],recommended_strategy:p[12],recommendation_state:p[13],
        a12_review_ref:null,experiment_id:null,outbound_authorized:0,spend_authorized:0,created_at:p[14]
      }); return;
    }
    if (/INSERT INTO autonomy_action_log/i.test(sql)) {
      this.tables.autonomy_action_log.set(p[0],{
        action_id:p[0],action_key:p[1],risk_class:'medium',autonomy_level:'human_approval_required',
        evidence_refs_json:p[2],reason_codes_json:p[3],result_json:p[4],
        public_write_authorized:0,public_side_effects:0,created_at:p[5]
      }); return;
    }
    if (/INSERT INTO autonomy_human_queue/i.test(sql)) {
      this.tables.autonomy_human_queue.set(p[0],{
        queue_id:p[0],action_id:p[1],priority:50,status:'pending',reason_codes_json:p[2],created_at:p[3]
      }); return;
    }
    if (/INSERT INTO a14_governance_links/i.test(sql)) {
      this.tables.a14_governance_links.set(p[0],{
        governance_link_id:p[0],opportunity_id:p[1],distribution_match_id:null,
        action_id:p[2],queue_id:p[3],evidence_refs_json:p[4],linked_at:p[5]
      }); return;
    }
    throw new Error('unhandled fake insert');
  }
}

function env(db=new FakeDB()) {
  return {
    BRAIN_PROPOSAL_API_ENABLED:'true',
    BRAIN_PROPOSAL_TOKEN:'proposal-secret',
    GROWTH_DB:db
  };
}

function basePayload() {
  const opportunityId='opp_12345678-1234-5234-9234-123456789012';
  const offerId='ofh_12345678-1234-5234-9234-123456789012';
  return {
    schema:'maison.a14-materialize.v1',
    opportunity:{
      opportunity_id:opportunityId,need_id:null,territory_code:'gifting',
      opportunity_score:null,confidence:0.7,known_dimensions:[],unknown_dimensions:['demand'],
      evidence_refs:['evd_x'],existing_solution_ids:[],knowledge_context_refs:['ocean:gifting'],
      status:'human_review_required',reason_codes:['brain_packet_ready_for_a14'],
      rule_version_id:'a14_policy_v1',model_version_id:null,input_hash:'a'.repeat(64),
      created_at:'2026-09-23T17:00:00.000Z'
    },
    offer_hypotheses:[{
      offer_hypothesis_id:offerId,opportunity_id:opportunityId,offer_type:'corporate_gifting',
      a3_solution_type:'b2b',existing_solution_id:null,fit_score:null,fit_confidence:0,
      economics:{capital_required_minor:null},validation_mode:'b2b_pilot',
      evidence_refs:['evd_x'],reason_codes:['new_offer_family_required'],
      human_review_required:true,launch_authorized:false,price_authorized:false,
      public_side_effects:false,created_at:'2026-09-23T17:00:01.000Z'
    }],
    distribution_matches:[],
    a12_review_payloads:[{
      opportunity_id:opportunityId,offer_hypothesis_id:offerId,distribution_match_id:null,
      human_review_required:true,requested_autonomy_level:'human_approval_required',
      evidence_refs:['evd_x'],reason_codes:['commercial_human_review_required'],
      outbound_authorized:false,spend_authorized:false,public_write_authorized:false
    }]
  };
}

function request(payload,{token='proposal-secret',method='POST'}={}) {
  return new Request('https://worker.example/internal/proposals/a14',{
    method,
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:method==='POST' ? JSON.stringify(payload) : undefined
  });
}

test('proposal API is hidden when disabled', async () => {
  const response=await handleBrainProposalRequest(request(basePayload()),{
    BRAIN_PROPOSAL_API_ENABLED:'false',
    BRAIN_PROPOSAL_TOKEN:'proposal-secret'
  });
  assert.equal(response.status,404);
});

test('proposal API requires its own bearer token', async () => {
  const response=await handleBrainProposalRequest(request(basePayload(),{token:'wrong'}),env());
  assert.equal(response.status,401);
});

test('valid A14 proposal persists hypotheses and A12 human review only', async () => {
  const e=env();
  const response=await handleBrainProposalRequest(request(basePayload()),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.mode,'analysis_and_human_review_only');
  assert.equal(body.offer_hypotheses,1);
  assert.equal(body.human_reviews,1);
  assert.equal(body.outbound_authorized,false);
  assert.equal(body.spend_authorized,false);
  assert.equal(body.public_write_authorized,false);
  assert.equal(body.experiment_authorized,false);
  assert.equal(e.tables.opportunity_hypotheses.size,1);
  assert.equal(e.tables.opportunity_offer_hypotheses.size,1);
  assert.equal(e.tables.autonomy_action_log.size,1);
  assert.equal(e.tables.autonomy_human_queue.size,1);
  assert.equal(e.tables.a14_governance_links.size,1);
  const action=[...e.tables.autonomy_action_log.values()][0];
  assert.equal(action.autonomy_level,'human_approval_required');
  assert.equal(action.public_write_authorized,0);
  const queue=[...e.tables.autonomy_human_queue.values()][0];
  assert.equal(queue.status,'pending');
});

test('same semantic proposal is idempotent', async () => {
  const e=env();
  let response=await handleBrainProposalRequest(request(basePayload()),e);
  assert.equal(response.status,200);
  const first=await response.json();
  assert.ok(first.inserted_statements>0);

  response=await handleBrainProposalRequest(request(basePayload()),e);
  assert.equal(response.status,200);
  const second=await response.json();
  assert.equal(second.inserted_statements,0);
  assert.equal(e.tables.opportunity_hypotheses.size,1);
  assert.equal(e.tables.opportunity_offer_hypotheses.size,1);
  assert.equal(e.tables.autonomy_human_queue.size,1);
});

test('same ID with semantic drift is rejected', async () => {
  const e=env();
  await handleBrainProposalRequest(request(basePayload()),e);
  const changed=basePayload();
  changed.offer_hypotheses[0].offer_type='service';
  changed.offer_hypotheses[0].a3_solution_type='service';
  const response=await handleBrainProposalRequest(request(changed),e);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'offer_payload_drift');
});

test('proposal cannot authorize launch price public write outbound or spend', async () => {
  for (const mutate of [
    p=>p.offer_hypotheses[0].launch_authorized=true,
    p=>p.offer_hypotheses[0].price_authorized=true,
    p=>p.offer_hypotheses[0].public_side_effects=true,
    p=>p.a12_review_payloads[0].outbound_authorized=true,
    p=>p.a12_review_payloads[0].spend_authorized=true,
    p=>p.a12_review_payloads[0].public_write_authorized=true
  ]) {
    const payload=basePayload(); mutate(payload);
    const response=await handleBrainProposalRequest(request(payload),env());
    assert.equal(response.status,400);
  }
});

test('every offer must enter human review queue', async () => {
  const payload=basePayload();
  payload.a12_review_payloads=[];
  const response=await handleBrainProposalRequest(request(payload),env());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'every_offer_requires_a12_review');
});

test('proposal privacy scan rejects direct PII', async () => {
  const payload=basePayload();
  payload.offer_hypotheses[0].economics={note:'contact me at person@example.com'};
  const response=await handleBrainProposalRequest(request(payload),env());
  assert.equal(response.status,400);
  assert.match((await response.json()).error,/proposal_privacy_email_detected/);
});
