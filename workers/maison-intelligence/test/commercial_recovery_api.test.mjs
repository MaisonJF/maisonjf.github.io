import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCommercialRecoveryRequest } from '../src/commercial_recovery_api.js';

class Statement {
 constructor(db,sql){this.db=db;this.sql=sql;this.p=[];}
 bind(...p){this.p=p;return this;}
 async run(){
  if(/INSERT OR IGNORE INTO commercial_recovery_journal/i.test(this.sql)){
   if(!this.db.rows.has(this.p[0])) this.db.rows.set(this.p[0],{recovery_id:this.p[0],kind:this.p[1],payload_json:this.p[2],intended_destination:this.p[3],state:this.p[4],source_ref:this.p[5],evidence_refs_json:this.p[6],attempt_count:0,last_error:null,integrated_ref:null,created_at:this.p[7],updated_at:this.p[8]});
  } else if(/state='pending_write'/i.test(this.sql)){
   const r=this.db.rows.get(this.p[2]); if(r&&['captured','pending_write'].includes(r.state)){r.state='pending_write';r.attempt_count++;r.last_error=this.p[0];r.updated_at=this.p[1];}
  } else if(/state='integrated'/i.test(this.sql)){
   const r=this.db.rows.get(this.p[2]); if(r&&['captured','pending_write'].includes(r.state)){r.state='integrated';r.integrated_ref=this.p[0];r.last_error=null;r.updated_at=this.p[1];}
  } else throw new Error('unhandled_sql');
  return {success:true};
 }
 async all(){return {results:[...this.db.rows.values()].filter(r=>['captured','pending_write'].includes(r.state))};}
}
class DB{constructor(){this.rows=new Map();} prepare(sql){return new Statement(this,sql);}}
const env=(db=new DB())=>({COMMERCIAL_RECOVERY_API_ENABLED:'true',COMMERCIAL_RECOVERY_TOKEN:'recovery-secret',GROWTH_DB:db});
const req=(path,body,method='POST')=>new Request('https://worker.example'+path,{method,headers:{Authorization:'Bearer recovery-secret','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});

test('commercial work survives a downstream write failure',async()=>{
 const e=env();
 let res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/capture',{kind:'product_candidate',payload:{name:'Produto preservado'},intended_destination:'data/products.js'}),e);
 assert.equal(res.status,200); const captured=await res.json();
 res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/failure',{recovery_id:captured.recovery_id,error:'simulated_git_failure'}),e);
 assert.equal((await res.json()).state,'pending_write');
 res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial',null,'GET'),e);
 let body=await res.json(); assert.equal(body.unresolved.length,1); assert.equal(body.unresolved[0].payload.name,'Produto preservado'); assert.equal(body.unresolved[0].attempt_count,1);
 res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/integrated',{recovery_id:captured.recovery_id,integrated_ref:'data/products.js#produto-preservado',readback_verified:true}),e);
 assert.equal((await res.json()).state,'integrated');
 res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial',null,'GET'),e);
 body=await res.json(); assert.equal(body.unresolved.length,0);
});
test('integration without readback is refused',async()=>{
 const e=env(); const c=await (await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/capture',{kind:'service_candidate',payload:{name:'Serviço'},intended_destination:'data/services.js'}),e)).json();
 const res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/integrated',{recovery_id:c.recovery_id,integrated_ref:'x',readback_verified:false}),e);
 assert.equal(res.status,400); assert.equal((await res.json()).error,'readback_required');
});
test('sensitive payload is refused',async()=>{
 const res=await handleCommercialRecoveryRequest(req('/internal/recovery/commercial/capture',{kind:'product_candidate',payload:{credentials:'nope'},intended_destination:'data/products.js'}),env());
 assert.equal(res.status,400); assert.match((await res.json()).error,/forbidden_payload_key/);
});
