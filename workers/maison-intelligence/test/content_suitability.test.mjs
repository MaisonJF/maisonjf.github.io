import test from 'node:test';
import assert from 'node:assert/strict';
import { detectOperationalCommercialTopic, editorialDestinationDecision } from '../src/content_suitability.js';

test('ecommerce and site-operation signals cannot enter game or Oracle',()=>{
  for(const value of [
    {sourceKey:'customer-journey'},
    {sourceKey:'mobile-commerce'},
    {sourceKey:'seo-category-pages'},
    {sourceTitle:'Checkout friction and conversion rate'},
    {sourceSummary:'Auditoria de desempenho do site e estratégia de SEO.'},
    {sourceKey:'supplier-pricing',sourceSummary:'Avaliar fornecedores e margens de lucro.'}
  ]){
    const result=detectOperationalCommercialTopic(value);
    assert.equal(result.eligibleForQuestionOrOracle,false,JSON.stringify(value));
    assert.ok(result.reasonCode);
  }
});

test('human topics are not blocked merely because they involve difficult feelings or money',()=>{
  for(const value of [
    {sourceKey:'vergonha-financeira-e-medo-de-olhar-para-os-numeros',sourceSummary:'A pessoa sente vergonha de falar sobre dinheiro com amigos.'},
    {sourceKey:'auto-silenciamento-para-preservar-o-vinculo',sourceSummary:'A pessoa deixa de dizer o que sente para evitar conflito.'},
    {sourceKey:'rituais-sensoriais-com-plantas',sourceSummary:'Pequenos rituais para marcar o fim do dia.'}
  ]){
    assert.equal(detectOperationalCommercialTopic(value).eligibleForQuestionOrOracle,true,JSON.stringify(value));
  }
});

test('candidate text itself is checked for operational ecommerce language',()=>{
  const result=detectOperationalCommercialTopic({
    sourceKey:'tema-geral',
    candidateTitle:'Como melhorar a conversão do checkout?',
    candidateBody:'Uma proposta de optimização do funil de vendas.'
  });
  assert.equal(result.eligibleForQuestionOrOracle,false);
  assert.equal(result.matchedIn,'candidate');
});

test('destination classification is explicit and can yield zero content',()=>{
  assert.deepEqual(editorialDestinationDecision(['none']),{valid:true,destinations:[]});
  assert.deepEqual(editorialDestinationDecision(['other_maison_asset']),{valid:true,destinations:[]});
  assert.deepEqual(editorialDestinationDecision(['pdi_game','vpc_test']),{valid:true,destinations:['pdi_game','vpc_test']});
  assert.deepEqual(editorialDestinationDecision(['sales_dashboard']),{valid:false,destinations:[]});
  assert.deepEqual(editorialDestinationDecision(undefined),{valid:false,destinations:[]});
});
