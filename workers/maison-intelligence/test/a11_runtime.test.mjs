import test from 'node:test';
import assert from 'node:assert/strict';
import { appendContentLearning, handleA11LearningRequest, A11RuntimeError } from '../src/a11_runtime.js';

const RULE='rul_e6217bb187b5ef0b6ee371286ed2e1e53e0d';
const EVENT='evt_'+'1'.repeat(36);
const PAYLOAD_HASH='a'.repeat(64);

function stableJson(value){
  if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
async function sha256(text){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function stableId(prefix,payload){return prefix+(await sha256(stableJson(payload))).slice(0,36);}

class FakeD1 {
  constructor({previous=null,duplicate=null}={}){
    this.previous=previous;
    this.duplicate=duplicate;
    this.batches=[];
  }
  prepare(sql){
    const db=this;
    return {
      bind(...args){
        return {
          sql,args,
          first:async()=>db.first(sql,args),
          run:async()=>({success:true})
        };
      }
    };
  }
  async first(sql,args){
    if(sql.includes("schema_key='maison_growth_a11_rule_version'"))return {schema_value:RULE};
    if(sql.includes("FROM rule_versions"))return {
      rule_version_id:RULE,
      version_label:'A11.2',
      definition_hash:'e6217bb187b5ef0b6ee371286ed2e1e53e0ddfd10cd16a1cc6c63d18f4ee9675',
      definition_json:JSON.stringify({
        policy_version:'A11.2',mode:'analysis_only',initial_confidence:50,
        confidence_delta_limits:{max_increase:15,max_decrease:20}
      })
    };
    if(sql.includes("FROM events"))return {
      event_id:EVENT,payload_hash:PAYLOAD_HASH,occurred_at:'2026-09-26T00:00:00.000Z',
      privacy_class:'aggregated',
      metadata_json:JSON.stringify({content_id:'cnt-piece-001',source_refs_hash:'b'.repeat(64)})
    };
    if(sql.includes("FROM learning_source_links"))return this.duplicate;
    if(sql.includes("SELECT confidence_after"))return this.previous;
    if(sql.includes("FROM learning_records WHERE learning_record_id"))return null;
    throw new Error('unexpected select: '+sql);
  }
  async batch(statements){
    this.batches.push(statements);
    return statements.map(()=>({success:true}));
  }
}

async function validPayload(){
  const refs=['a1:event:'+EVENT,'content:source_refs_hash:'+'b'.repeat(64)];
  const sourceId=await stableId('cnt_',{content_id:'cnt-piece-001',refs:['content:cnt-piece-001',...refs]});
  const subjectId=await stableId('can_',{content_id:'cnt-piece-001'});
  return {
    source_event_id:EVENT,
    record:{
      learning_record_id:'lrn_'+'2'.repeat(36),
      source_id:sourceId,
      subject_id:subjectId,
      signal_class:'insufficient',
      expected_json:{economic_value_minor:null,ctr_bps:null},
      observed_json:{economic_value_minor:null,ctr_bps:700,observation_count:1,economic_observation_count:0},
      economic_value_minor:null,
      confidence_before:50,
      confidence_after:50,
      confidence_delta:0,
      reason_codes:['INSUFFICIENT_OBSERVATIONS'],
      evidence_refs:['content:cnt-piece-001',...refs],
      input_hash:'c'.repeat(64)
    }
  };
}

test('A11 content append persists only append-only internal rows',async()=>{
  const db=new FakeD1();
  const result=await appendContentLearning(db,await validPayload());
  assert.equal(result.status,'accepted');
  assert.equal(result.duplicate,false);
  assert.equal(db.batches.length,1);
  assert.equal(db.batches[0].length,4);
});

test('A11 rejects stale confidence',async()=>{
  const db=new FakeD1({previous:{confidence_after:60}});
  await assert.rejects(
    async()=>appendContentLearning(db,await validPayload()),
    error=>error instanceof A11RuntimeError&&error.code==='stale_learning_confidence'
  );
});

test('A11 rejects invented Content economics',async()=>{
  const db=new FakeD1();
  const payload=await validPayload();
  payload.record.economic_value_minor=1000;
  await assert.rejects(
    ()=>appendContentLearning(db,payload),
    error=>error instanceof A11RuntimeError&&error.code==='content_economics_require_a3_link'
  );
});

test('A11 detects already learned source snapshot before new confidence mutation',async()=>{
  const db=new FakeD1({previous:{confidence_after:80},duplicate:{learning_record_id:'lrn_'+'9'.repeat(36),input_hash:'d'.repeat(64)}});
  const result=await appendContentLearning(db,await validPayload());
  assert.equal(result.status,'duplicate');
  assert.equal(result.duplicate,true);
  assert.equal(db.batches.length,0);
});

test('A11 write endpoint is disabled by default',async()=>{
  const request=new Request('https://brain.maison-jf.com/internal/a11/content-learning',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(await validPayload())
  });
  const res=await handleA11LearningRequest(request,{});
  assert.equal(res.status,404);
});
