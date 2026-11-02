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
// Locate the two public success returns by their explicit paid marker.
// Do not parse nested object literals with a single regular expression.
const starts=[...source.matchAll(/return json\\(\\{\\s*paid:true,/g)].map(match=>match.index);
assert.equal(starts.length,2,'Expected two Oracle success responses');
for(const start of starts){
  const tail=source.slice(start);
  const end=tail.indexOf('\\n    });');
  const endFallback=tail.indexOf('\\n      });');
  const candidates=[end,endFallback].filter(index=>index>=0);
  assert.ok(candidates.length,'Oracle response closing delimiter missing');
  const body=tail.slice(0,Math.min(...candidates));
  assert.match(body,/\\breading\\s*:/,'Oracle response must contain reading');
  assert.doesNotMatch(body,/^\\s*theme\\s*[,}:]/m,'Oracle public response leaks theme');
  assert.doesNotMatch(body,/^\\s*internal_theme\\s*[,}:]/m,'Oracle public response leaks internal_theme');
}
console.log('PASS: both Oracle success response objects omit theme and internal_theme (static check)');
