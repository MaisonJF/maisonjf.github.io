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
const publicResponses=[...source.matchAll(/return json\(\{([\s\S]*?)\}\);/g)].map(m=>m[1]);
assert.ok(publicResponses.length>=2,'Expected oracle success response objects');
for(const response of publicResponses){
  if(!response.includes('reading:'))continue;
  assert.doesNotMatch(response,/\btheme\s*[:,]/,'Oracle success payload leaks theme');
  assert.doesNotMatch(response,/\binternal_theme\s*[:,]/,'Oracle success payload leaks internal_theme');
}
console.log('PASS: oracle route success payload source omits internal theme fields (static check)');
