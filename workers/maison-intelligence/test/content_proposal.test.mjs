import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditorialProposal } from '../src/content_proposal.js';

function alert(overrides={}){
  return {
    observation_id:'oma_12345678-1234-1234-1234-123456789012',
    evidence_refs:['oms_12345678-1234-1234-1234-123456789012'],
    independent_roots:['https://example.org/a','https://example.org/b'],
    ocean_alert_priority:88,
    ocean_alert_kind:'commercial_opportunity',
    response_excerpt:'Public signal excerpt.',
    ...overrides
  };
}

test('strong Brain alert becomes a ready short-video proposal without publishing',async()=>{
  const proposal=await buildEditorialProposal({
    brainAlert:alert(),
    oceanContext:{
      oceanKey:'adiar-o-sono-para-recuperar-autonomia',
      matchedTerms:['revenge bedtime','me time at night']
    }
  });
  assert.equal(proposal.state,'ready_for_editorial_review');
  assert.equal(proposal.editorial_decision.format,'short_video');
  assert.equal(proposal.editorial_decision.priority_band,'today');
  assert.equal(proposal.draft.on_screen_url,'maison-jf.com');
  assert.equal(proposal.destination.approved_existing_path,'/teste/');
  assert.equal(proposal.video_draft_plan.engine,'maison_short_video_zero_cost');
  assert.equal(proposal.video_draft_plan.shots.length,3);
  assert.equal(proposal.video_draft_plan.overlays.persistent_url,'maison-jf.com');
  assert.equal(proposal.video_draft_plan.execution_gate.automatic_generation,false);
  assert.equal(proposal.gates.automatic_publication,false);
  assert.equal(proposal.gates.spend_authorized,false);
  assert.equal(/[—–]/.test(proposal.draft.hook),false);
});

test('medium-priority alerts queue editorially instead of forcing today',async()=>{
  const proposal=await buildEditorialProposal({
    brainAlert:alert({ocean_alert_priority:74,ocean_alert_kind:'reinforced'}),
    oceanContext:{
      oceanKey:'telepressao-e-disponibilidade-permanente',
      matchedTerms:['telepressure']
    }
  });
  assert.equal(proposal.editorial_decision.priority_band,'queue');
  assert.equal(proposal.editorial_decision.worth_attention_today,false);
});

test('weak alert creates no content proposal',async()=>{
  const proposal=await buildEditorialProposal({
    brainAlert:alert({ocean_alert_priority:55}),
    oceanContext:{oceanKey:'doomscrolling-para-tentar-reduzir-incerteza',matchedTerms:['doomscrolling']}
  });
  assert.equal(proposal,null);
});

test('physical ritual opportunity points only to an existing product destination',async()=>{
  const proposal=await buildEditorialProposal({
    brainAlert:alert({ocean_alert_priority:91}),
    oceanContext:{oceanKey:'rituais-sensoriais-com-plantas-como-marcadores-de-transicao',matchedTerms:['sensory ritual']}
  });
  assert.equal(proposal.destination.approved_existing_path,'/produtos/');
  assert.equal(proposal.destination.may_create_new_offer,false);
});

test('today proposal is still internal and cannot auto-publish or spend',async()=>{
  const proposal=await buildEditorialProposal({
    brainAlert:alert({ocean_alert_priority:94}),
    oceanContext:{
      oceanKey:'micro-luxo-como-recompensa-e-ritual',
      matchedTerms:['little treat']
    }
  });
  assert.equal(proposal.editorial_decision.worth_attention_today,true);
  assert.equal(proposal.gates.human_editorial_review_required,true);
  assert.equal(proposal.gates.automatic_publication,false);
  assert.equal(proposal.gates.automatic_scheduling,false);
  assert.equal(proposal.gates.spend_authorized,false);
});

