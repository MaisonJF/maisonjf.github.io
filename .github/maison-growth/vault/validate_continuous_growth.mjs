import assert from 'node:assert/strict';
import { CONTENT_GAP_VERSION, detectOracleContentNeeds, detectQuestionContentNeeds } from '../../../functions/_lib/content-gap-detector.js';

const stages={open:60,recognize:60,deepen:60,touch:60,close:30,signature:30};
const questions=[];
let n=0;
for(const [stage,count] of Object.entries(stages)){
  for(let i=0;i<count;i++) questions.push({id:'q'+(++n),theme:'relacoes',stage,status:'active',exposure:'paid',rotationState:'normal',target:['self','partner','both','prediction'][i%4]});
}
const qNeeds=detectQuestionContentNeeds({theme:'relacoes',questions});
assert.equal(CONTENT_GAP_VERSION,'content-gap-v2-continuous');
const qDepth=qNeeds.filter(x=>x.reasonCode==='continuous_depth');
assert.equal(qDepth.length,6);
assert.ok(qDepth.every(x=>x.metadata.continuousGrowth===true&&x.metadata.catalogueCap===null&&x.metadata.nextMilestone>x.metadata.have));

const roles={opening:8,recognition:10,tension:8,counterpoint:8,reframe:10,movement:8,close:8};
const blocks=[];
let b=0;
for(const [role,count] of Object.entries(roles)){
  for(let i=0;i<count;i++) blocks.push({id:'b'+(++b),territory:'amor',role,status:'active',rotationState:'normal'});
}
const oDepth=detectOracleContentNeeds({territory:'amor',blocks}).filter(x=>x.reasonCode==='continuous_depth');
assert.equal(oDepth.length,7);
assert.ok(oDepth.every(x=>x.metadata.nextMilestone>x.metadata.have));
const sparse=detectQuestionContentNeeds({theme:'relacoes',questions:questions.filter(x=>x.stage!=='signature')});
assert.ok(sparse.some(x=>x.stageOrRole==='signature'&&x.reasonCode==='coverage_gap'));
console.log('Continuous Vault growth contract passed');
