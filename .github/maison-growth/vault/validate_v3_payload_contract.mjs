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
// Both new and reopened readings go through the same public response.
const responses=[...source.matchAll(/return json\(\{\s*paid\s*:\s*true,([\s\S]*?)\}\);/g)];
assert.equal(responses.length,1,'Expected one shared Oracle success response');
const fields=responses[0][1].trim().split(/,\s*\n/).map(line=>line.trim().match(/^(\w+)(?:\s*:|$)/)?.[1]);
assert.deepEqual(fields,['locale','session_id','reading','amount_total','currency']);
assert.match(responses[0][1],/reading:\s*composed\.reading\s*,/);
console.log('PASS: shared Oracle success response omits internal theme');
