import assert from 'node:assert/strict';
import {composeQuestionSession} from '../../../functions/_lib/question-composer.js';

const stages=['recognize','deepen','confront','integrate'];
const questions=stages.flatMap((stage,s)=>Array.from({length:8},(_,i)=>({
  id:`test_${s}_${i}`,theme:'*',stage,status:'active',exposure:'paid',
  text:`Pergunta de teste ${stage} ${i}`
})));
for(let run=0;run<30;run++){
  const result=composeQuestionSession({seed:`v3-test-${run}`,questions});
  const cards=[...result.packA,...result.packB];
  assert.equal(result.packA.length,8);
  assert.equal(result.packB.length,8);
  assert.equal(new Set(cards.map(q=>q.id)).size,16);

}
const oneStage=composeQuestionSession({seed:'single-stage',questions:questions.concat(Array.from({length:16},(_,i)=>({id:`extra_${i}`,theme:'*',stage:'recognize',status:'active',exposure:'paid',text:`Extra ${i}`}))).filter(q=>q.stage==='recognize')});
assert.equal(oneStage.packA.length+oneStage.packB.length,16);
console.log('PASS: 16 unique questions, 8+8 packs, 30 seeds; no stage quotas');

import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../../functions/api/oracle-reading-live.js',import.meta.url),'utf8');
// Inspect the two explicit successful JSON response blocks without regex parsing.
const marker='return json(';
const starts=[];
let offset=0;
while((offset=source.indexOf(marker,offset))!==-1){
  const segment=source.slice(offset,offset+180);
  if(segment.includes('paid:true'))starts.push(offset);
  offset+=marker.length;
}
assert.equal(starts.length,2,'Expected two Oracle success responses');
for(const start of starts){
  const tail=source.slice(start);
  const closing=tail.indexOf('});');
  assert.ok(closing>0,'Oracle response closing delimiter missing');
  const body=tail.slice(0,closing);
  assert.ok(body.includes('reading:'),'Oracle response must contain reading');
  assert.ok(!body.split('\\n').some(line=>['theme,','theme:','internal_theme,','internal_theme:'].some(field=>line.trim().startsWith(field))),'Oracle success response leaks internal theme');
}
console.log('PASS: both Oracle success responses omit internal theme (static check)');
