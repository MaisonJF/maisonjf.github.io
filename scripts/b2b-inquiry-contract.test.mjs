import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequestGet } from '../functions/api/b2b-lead.js';

const baseData={name:'Cliente Teste',company:'Empresa de Teste',email:'teste@exemplo.pt',activity:'loja',goal:'diferenciar',message:'Quero saber mais sobre revenda.',consent:true,website:''};
const key='b2b:application:123e4567-e89b-42d3-a456-426614174000';
const req=(body,origin='https://maison-jf.com')=>new Request('https://maison-jf.com/api/b2b-lead',{method:'POST',headers:{'content-type':'application/json','Origin':origin},body:JSON.stringify(body)});
const application=(data=baseData)=>({type:'b2b_application',idempotency_key:key,data});
function fakeDb(success=true){
 const statements=[];
 return {
  statements,
  prepare(sql){
   const record={sql,args:[]};statements.push(record);
   const prepared={
    bind(...args){record.args=args;return prepared;},
    async run(){return {success};}
   };
   return prepared;
  }
 };
}
test('a consented B2B inquiry is stored separately and only then confirmed',async()=>{
 const db=fakeDb();
 const response=await onRequestPost({request:req(application()),env:{MAISON_BRAIN_DB:db}});
 assert.equal(response.status,201);
 const body=await response.json();
 assert.equal(body.ok,true);assert.equal(body.stored,true);
 assert.equal(body.reference,key);
 assert.ok(db.statements.some(x=>x.sql.includes('CREATE TABLE IF NOT EXISTS b2b_inquiries')));
 const insert=db.statements.find(x=>x.sql.includes('INSERT OR IGNORE INTO b2b_inquiries'));
 assert.ok(insert);
 assert.ok(insert.args.includes('teste@exemplo.pt'));
 assert.ok(insert.args.includes('Quero saber mais sobre revenda.'));
 assert.ok(!db.statements.some(x=>x.sql.includes('INSERT INTO events')));
});
test('a missing D1 binding never produces a false success',async()=>{
 const response=await onRequestPost({request:req(application()),env:{}});
 assert.equal(response.status,503);
 assert.equal((await response.json()).stored,false);
});
test('a failed D1 write never produces a false success',async()=>{
 const response=await onRequestPost({request:req(application()),env:{MAISON_BRAIN_DB:fakeDb(false)}});
 assert.equal(response.status,503);
 assert.equal((await response.json()).stored,false);
});
test('B2B form validation rejects requests without consent or with invalid email',async()=>{
 for(const data of [{...baseData,consent:false},{...baseData,email:'not-an-email'}, {...baseData,website:'spam'}]){
  const response=await onRequestPost({request:req(application(data)),env:{MAISON_BRAIN_DB:fakeDb()}});
  assert.equal(response.status,400);
  assert.equal((await response.json()).stored,false);
 }
});
test('reject cross-origin submits and invalid JSON contract',async()=>{
 const response=await onRequestPost({request:req(application(),'https://attacker.invalid'),env:{MAISON_BRAIN_DB:fakeDb()}});
 assert.equal(response.status,403);
 const wrong=await onRequestPost({request:req({type:'b2b_application',data:baseData}),env:{MAISON_BRAIN_DB:fakeDb()}});
 assert.equal(wrong.status,400);
});
test('legacy telemetry does not impersonate a captured contact',async()=>{
 const response=await onRequestPost({request:req({event_type:'b2b.lead',idempotency_key:'abc',metadata:{}}),env:{}});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ignored,true);
 assert.equal(result.stored,undefined);
});
test('the B2B endpoint is write-only',async()=>{
 const response=await onRequestGet();
 assert.equal(response.status,405);
});
