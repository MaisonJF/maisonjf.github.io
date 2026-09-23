import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBrainReviewDecisionRequest } from '../src/review_decision_api.js';

class FakeStatement {
  constructor(db,sql){ this.db=db; this.sql=sql; this.params=[]; }
  bind(...params){ this.params=params; return this; }
  async all(){
    if (/FROM autonomy_human_queue q/i.test(this.sql)) {
      const queue=this.db.queue.get(String(this.params[0]));
      if(!queue) return {results:[]};
      const action=this.db.actions.get(queue.action_id);
      return {results:[{
        queue_id:queue.queue_id,action_id:queue.action_id,status:queue.status,
        action_key:action.action_key,risk_class:action.risk_class,
        autonomy_level:action.autonomy_level,
        public_write_authorized:action.public_write_authorized,
        public_side_effects:action.public_side_effects
      }]};
    }
    if (/FROM autonomy_human_review_resolutions/i.test(this.sql)) {
      const row=this.db.resolutions.get(String(this.params[0]));
      return {results:row?[{...row}]:[]};
    }
    return {results:[]};
  }
}

class FakeDB {
  constructor(){
    const actionId='act_12345678-1234-1234-1234-123456789012';
    const queueId='inq_12345678-1234-1234-1234-123456789012';
    this.actions=new Map([[actionId,{
      action_id:actionId,action_key:'commercial_opportunity_review',
      risk_class:'medium',autonomy_level:'human_approval_required',
      public_write_authorized:0,public_side_effects:0
    }]]);
    this.queue=new Map([[queueId,{queue_id:queueId,action_id:actionId,status:'pending'}]]);
    this.resolutions=new Map();
  }
  prepare(sql){ return new FakeStatement(this,sql); }
  async batch(statements){
    for(const stmt of statements){
      if(/INSERT INTO autonomy_human_review_resolutions/i.test(stmt.sql)){
        const p=stmt.params;
        this.resolutions.set(p[1],{
          review_resolution_id:p[0],queue_id:p[1],action_id:p[2],decision:p[3],
          approved_scope:'experiment_planning_only',decision_reason:p[4],
          evidence_refs_json:p[5],actor_kind:'human',
          public_write_authorized:0,outbound_authorized:0,spend_authorized:0,
          experiment_execution_authorized:0,decided_at:p[6]
        });
      }
    }
    return statements.map(()=>({success:true}));
  }
}

function env(db=new FakeDB()){
  return {
    BRAIN_REVIEW_DECISION_ENABLED:'true',
    BRAIN_REVIEW_DECISION_TOKEN:'decision-secret',
    GROWTH_DB:db
  };
}

function payload(decision='approved'){
  return {
    schema:'maison.a12-review-decision.v1',
    queue_id:'inq_12345678-1234-1234-1234-123456789012',
    decision,
    decision_reason:decision==='approved'?'Vale a pena planear o teste':'Não avançar neste momento',
    evidence_refs:['human:review:2026-09-23']
  };
}

function request(body,{token='decision-secret'}={}){
  return new Request('https://worker.example/internal/reviews/a12',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
}

test('review decision API is hidden by default', async()=>{
  const response=await handleBrainReviewDecisionRequest(request(payload()),{
    BRAIN_REVIEW_DECISION_ENABLED:'false',
    BRAIN_REVIEW_DECISION_TOKEN:'decision-secret'
  });
  assert.equal(response.status,404);
});

test('review decision requires separate token', async()=>{
  const response=await handleBrainReviewDecisionRequest(request(payload(),{token:'wrong'}),env());
  assert.equal(response.status,401);
});

test('approval authorizes planning only', async()=>{
  const e=env();
  const response=await handleBrainReviewDecisionRequest(request(payload('approved')),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.decision,'approved');
  assert.equal(body.experiment_planning_authorized,true);
  assert.equal(body.experiment_execution_authorized,false);
  assert.equal(body.public_write_authorized,false);
  assert.equal(body.outbound_authorized,false);
  assert.equal(body.spend_authorized,false);
  assert.equal(e.resolutions.size,1);
});

test('rejection authorizes nothing', async()=>{
  const response=await handleBrainReviewDecisionRequest(request(payload('rejected')),env());
  const body=await response.json();
  assert.equal(body.decision,'rejected');
  assert.equal(body.experiment_planning_authorized,false);
  assert.equal(body.experiment_execution_authorized,false);
});

test('same decision is idempotent', async()=>{
  const e=env();
  let response=await handleBrainReviewDecisionRequest(request(payload('approved')),e);
  assert.equal(response.status,200);
  response=await handleBrainReviewDecisionRequest(request(payload('approved')),e);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.idempotent,true);
  assert.equal(e.resolutions.size,1);
});

test('different second decision is a conflict', async()=>{
  const e=env();
  await handleBrainReviewDecisionRequest(request(payload('approved')),e);
  const response=await handleBrainReviewDecisionRequest(request(payload('rejected')),e);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'review_decision_already_resolved_with_different_payload');
});

test('non-commercial action cannot be approved through this surface', async()=>{
  const e=env();
  const action=[...e.actions.values()][0];
  action.action_key='price_change';
  const response=await handleBrainReviewDecisionRequest(request(payload()),e);
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'review_action_not_commercial_opportunity');
});

test('PII is rejected', async()=>{
  const body=payload();
  body.decision_reason='Falar com person@example.com';
  const response=await handleBrainReviewDecisionRequest(request(body),env());
  assert.equal(response.status,400);
  assert.equal((await response.json()).error,'review_decision_pii_forbidden');
});
