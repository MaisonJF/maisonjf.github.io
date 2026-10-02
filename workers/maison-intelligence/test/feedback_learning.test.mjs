import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REVIEWER_ROLES,
  buildReviewerPrompt,
  normalizePatternKey,
  promoteLearningStatus,
  synthesizePatternsFromReviews
} from '../src/feedback_learning.js';
import { candidatePrompt } from '../src/editorial_candidate_generation.js';
import { buildExpansionPrompt } from '../src/expansion_foundry.js';

test('synthetic feedback cannot become active learning without corroboration',()=>{
  assert.equal(promoteLearningStatus({
    existingOccurrence:0,
    supportingRoles:1,
    evidenceCount:1,
    confidence:95
  }),'candidate');
  assert.equal(promoteLearningStatus({
    existingOccurrence:0,
    supportingRoles:3,
    evidenceCount:3,
    confidence:80
  }),'active');
  assert.equal(promoteLearningStatus({
    existingOccurrence:1,
    supportingRoles:2,
    evidenceCount:2,
    confidence:70
  }),'active');
});

test('learning pattern keys are stable and machine safe',()=>{
  assert.equal(normalizePatternKey('Clareza sem matar o Mistério'),'clareza-sem-matar-o-misterio');
});

test('reviewer prompt treats synthetic criticism as non-causal and may use OSIRIS context',()=>{
  const prompt=buildReviewerPrompt({
    role:REVIEWER_ROLES[0],
    feedback:[{feedback_id:'fb_a',persona_id:'skeptic',page_key:'home',opinion:'exemplo'}],
    osiris:[{observation_id:'obs_a',territory_key:'news',excerpt:'contexto'}]
  });
  assert.match(prompt,/não testemunhos reais nem prova causal/i);
  assert.match(prompt,/OSIRIS OSINT/i);
  assert.match(prompt,/não inventes evidência/i);
});

test('active learning is injected into editorial generation as hypothesis, not command',()=>{
  const prompt=candidatePrompt({
    oceanContext:{oceanKey:'teste',matchedTerms:['clareza']},
    brainAlert:{response_excerpt:'sinal'},
    learningPatterns:[{
      scope:'voice',
      title:'Clareza sem matar mistério',
      guidance:'Diz o que é necessário para agir, preservando o código simbólico.',
      confidence:86,
      occurrence_count:2
    }]
  });
  assert.match(prompt,/APRENDIZAGEM EDITORIAL ATIVA/i);
  assert.match(prompt,/Clareza sem matar mistério/i);
  assert.match(prompt,/não são factos nem ordens de publicação/i);
});

test('active learning is injected into Foundry without overriding Maison identity',()=>{
  const prompt=buildExpansionPrompt({
    spec:{key:'openrouter:test:free',providerId:'openrouter',modelId:'test:free',lens:'commercial_reuse'},
    context:{
      signals:[],
      existing_assets:['PÁRA DE IGNORAR!'],
      feedback_learning:[{
        scope:'conversion',
        title:'Próximo passo explícito',
        guidance:'Torna a ação seguinte legível sem transformar a página num funil genérico.',
        confidence:82,
        occurrence_count:3
      }]
    }
  });
  assert.match(prompt,/APRENDIZAGEM ATIVA DO CONSELHO/i);
  assert.match(prompt,/Próximo passo explícito/i);
  assert.match(prompt,/Não destruas identidade MAISON/i);
});


test('deterministic synthesis merges equivalent keys and normalizes 8/9 confidence to 80/90',()=>{
  const feedbackIds=['fb_one'];
  const reviews=[
    {
      role:'evidence_auditor',
      payload:{claims:[{
        pattern_key:'excesso_texto_mobile',
        scope:'mobile',
        title:'Excesso de texto em mobile',
        guidance:'Reduzir densidade e melhorar hierarquia visual.',
        stance:'support',
        confidence:8,
        feedback_ids:['fb_one'],
        osiris_refs:[],
        reason:'Leitura difícil.'
      }]}
    },
    {
      role:'maison_guardian',
      payload:{claims:[{
        pattern_key:'excesso-texto-mobile',
        scope:'mobile',
        title:'Excesso de texto em mobile',
        guidance:'Dar prioridade ao essencial sem perder a voz.',
        stance:'support',
        confidence:9,
        feedback_ids:['fb_one'],
        osiris_refs:[],
        reason:'A crítica é útil sem pedir uma estética genérica.'
      }]}
    }
  ];
  const patterns=synthesizePatternsFromReviews(reviews,{feedbackIds,osirisIds:[],existing:[]});
  assert.equal(patterns.length,1);
  assert.equal(patterns[0].pattern_key,'excesso-texto-mobile');
  assert.deepEqual(patterns[0].supporting_roles,['evidence_auditor','maison_guardian']);
  assert.equal(patterns[0].confidence,85);
  assert.deepEqual(patterns[0].feedback_ids,['fb_one']);
});
