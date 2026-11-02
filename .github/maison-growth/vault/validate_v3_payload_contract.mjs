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
// Inspect only the two successful JSON return objects, not the whole handler.
const publicResponses=[...source.matchAll(/return json\\(\\{([\\s\\S]*?)\\}\\);/g)]
  .map(match=>match[1])
  .filter(body=>/\\bpaid\\s*:\\s*true/.test(body)&&/\\breading\\s*:/.test(body));
assert.equal(publicResponses.length,2,'Expected composed and fallback Oracle success payloads');
for(const body of publicResponses){
  assert.doesNotMatch(body,/\\btheme\\s*[:,]/,'Oracle success payload leaks theme');
  assert.doesNotMatch(body,/\\binternal_theme\\s*[:,]/,'Oracle success payload leaks internal_theme');
}
console.log('PASS: both Oracle success response objects omit theme and internal_theme (static check)');
