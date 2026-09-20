import assert from 'node:assert/strict';
import {composeVpcQuestionSet,VPC_QUESTION_ENGINE_VERSION} from '../../../functions/_lib/vpc-question-engine.js';

const expectations={attention:12,apego:10,afeto:10};
const seen={attention:new Set(),apego:new Set(),afeto:new Set()};

for(const [test,count] of Object.entries(expectations)){
  for(let i=0;i<24;i++){
    const payload=composeVpcQuestionSet({test,seed:'guard-'+test+'-'+i,vaultQuestions:[]});
    assert.equal(payload.version,VPC_QUESTION_ENGINE_VERSION);
    assert.equal(payload.questions.length,count);
    assert.equal(new Set(payload.questions.map(q=>Array.isArray(q)?q[0]:q.q)).size,count);
    for(const q of payload.questions)seen[test].add(Array.isArray(q)?q[0]:q.q);
  }
}

assert.ok(seen.attention.size>=40,'attention ocean pool is too repetitive');
assert.ok(seen.apego.size>=35,'attachment ocean pool is too repetitive');
assert.ok(seen.afeto.size>=35,'affection ocean pool is too repetitive');

const vaultAttention={
  question_id:'guard-public-attention',
  text:'Quando uma coisa pequena cresce por dentro, o que te prende primeiro?',
  theme:'vpc-attention',
  product_fit_json:JSON.stringify({vpc:{test:'attention',choices:[
    {text:'Sentir que não fui visto.',primary:'seen',secondary:'belong'},
    {text:'Sentir distância numa ligação.',primary:'attachment',secondary:'control'},
    {text:'Deixar-me para depois.',primary:'self',secondary:'load'},
    {text:'Precisar de fechar a incerteza.',primary:'control',secondary:'security'}
  ]}}),
  source_ocean_id:'guard-ocean'
};
const withVault=composeVpcQuestionSet({test:'attention',seed:'vault-guard',vaultQuestions:[vaultAttention]});
assert.ok(withVault.questions.some(q=>q.q===vaultAttention.text),'approved public vault question was not blended');

console.log('VPC Ocean/Vault question engine passed',Object.fromEntries(Object.entries(seen).map(([k,v])=>[k,v.size])));
