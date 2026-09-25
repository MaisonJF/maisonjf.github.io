import fs from 'node:fs';
import path from 'node:path';
import {MAISON_B2B_BRAIN,maisonB2bKnowledgeContext} from '../../../functions/_lib/b2b-offer-brain.js';
import {MAISON_KNOWLEDGE_GRAPH} from '../../../functions/_lib/maison-knowledge-graph.js';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=maisonB2bKnowledgeContext();
const graph=MAISON_KNOWLEDGE_GRAPH;
const surface=graph.surfaces.find(x=>x.id===ctx.surface.id);

assert(surface,'professional_surface_missing_from_knowledge_graph');
assert(surface.url===ctx.surface.url,'professional_surface_url_mismatch');
assert(surface.role===ctx.surface.role,'professional_surface_role_mismatch');
assert(graph.professionalLayer,'professional_layer_missing_from_knowledge_graph');
assert(graph.professionalLayer.serviceAssetRef===MAISON_B2B_BRAIN.serviceAssetRef,'b2b_service_asset_ref_mismatch');

const contractSegments=ctx.segments.map(x=>x.id).sort();
const graphSegments=(graph.professionalLayer.segments||[]).map(x=>x.id).sort();
assert(JSON.stringify(contractSegments)===JSON.stringify(graphSegments),'professional_segment_contract_drift');

const contractNeeds=ctx.needs.map(x=>x.id).sort();
const graphNeeds=(graph.professionalLayer.needs||[]).map(x=>x.id).sort();
assert(JSON.stringify(contractNeeds)===JSON.stringify(graphNeeds),'professional_need_contract_drift');

assert((graph.professionalLayer.offerFamilies||[]).length===(MAISON_B2B_BRAIN.offerFamilies||[]).length,'b2b_offer_family_projection_drift');
assert(graph.professionalLayer.leadContract?.canonicalEvent==='b2b.lead','b2b_canonical_lead_contract_missing');
assert(graph.professionalLayer.leadContract?.runtimeStatus.includes('central_telemetry_or_commerce'),'b2b_lead_contract_must_not_claim_parallel_runtime');
assert(MAISON_B2B_BRAIN.evidencePolicy?.noSyntheticDemand,'b2b_evidence_policy_missing');
assert(MAISON_B2B_BRAIN.routes.some(x=>x.role==='lead'),'b2b_lead_route_missing');

for(const offer of MAISON_B2B_BRAIN.offerFamilies||[]){
  assert(offer.claimLimit,'b2b_offer_claim_limit_missing:'+offer.id);
  if(['active_quote','manual_proposal','pilot_by_conversation'].includes(offer.status)){
    assert(Array.isArray(offer.routes)&&offer.routes.length>0,'b2b_offer_route_missing:'+offer.id);
  }
  if(['research_validation','future_validation'].includes(offer.status)){
    assert((offer.routes||[]).length===0,'unvalidated_b2b_offer_must_not_have_public_route:'+offer.id);
  }
}
assert(MAISON_B2B_BRAIN.recurrence?.rule,'b2b_recurrence_rule_missing');
assert(!MAISON_B2B_BRAIN.recurrence.supportedNow.includes('subscription'),'b2b_subscription_cannot_be_invented');

assert((graph.professionalLayer.researchCandidates||[]).length===(MAISON_B2B_BRAIN.researchCandidates||[]).length,'b2b_research_candidate_projection_drift');
for(const candidate of MAISON_B2B_BRAIN.researchCandidates||[]){
  assert(candidate.status!=='market_demand_proven','unsupported_market_demand_claim:'+candidate.id);
  assert(candidate.claimLimit,'research_candidate_claim_limit_missing:'+candidate.id);
  assert(Array.isArray(candidate.evidence)&&candidate.evidence.length>=2,'research_candidate_cross_source_evidence_missing:'+candidate.id);
}

assert(graph.professionalLayer.professionalNetwork,'professional_network_missing_from_graph');
assert(graph.professionalLayer.professionalNetwork.credentialIssuer==='maison-jf','professional_network_credential_authority_drift');
assert(graph.professionalLayer.professionalNetwork.franchiseStatus==='not_yet','professional_network_franchise_promoted_without_validation');
assert(graph.professionalLayer.professionalNetwork.safeguards?.sublicensing===false,'professional_network_sublicensing_must_default_false');
assert(graph.professionalLayer.professionalNetwork.safeguards?.centralCertification===true,'professional_network_certification_must_remain_central');
const trainer=(MAISON_B2B_BRAIN.professionalNetwork?.levels||[]).find(x=>x.id==='licensed_trainer');
assert(trainer,'licensed_trainer_level_missing');
assert(trainer.cannot.includes('emitir_certificacao_final_em_nome_proprio'),'licensed_trainer_central_certification_guard_missing');

for(const segment of MAISON_B2B_BRAIN.segments){
  assert(['public_validated','pilot_surface'].includes(segment.status),'unexpected_professional_segment_status:'+segment.id);
  assert(Array.isArray(segment.routes)&&segment.routes.length>0,'professional_segment_route_missing:'+segment.id);
}

const repoRoot=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
const test=fs.readFileSync(path.join(repoRoot,'profissionais/teste/index.html'),'utf8');
const contact=fs.readFileSync(path.join(repoRoot,'contacto/index.html'),'utf8');
const services=fs.readFileSync(path.join(repoRoot,'data/services.js'),'utf8');
const contextScript=fs.readFileSync(path.join(repoRoot,'profissionais/b2b-context.js'),'utf8');

for(const token of ["['organizacao'","['equipa'","['formacao'","['workshop'","'training_pilot'","interesse=b2b-formacao","withB2bContext"]){
  assert(test.includes(token),'professional_test_contract_missing:'+token);
}
for(const token of ["'b2b-presentes'","'b2b-formacao'","b2b_business","b2b_result"]){
  assert(contact.includes(token),'b2b_contact_handoff_missing:'+token);
}
for(const token of ['organizacao','equipa','formacao','training_pilot']){
  assert(contextScript.includes(token),'b2b_context_whitelist_missing:'+token);
}
assert(services.includes("slug:'b2b'"),'b2b_service_catalogue_entry_missing');
assert(services.includes('Pilotos para equipas são não-clínicos'),'b2b_service_safety_boundary_missing');

const professionalDir=path.join(repoRoot,'profissionais');
for(const name of fs.readdirSync(professionalDir).filter(x=>x.endsWith('.html'))){
  const html=fs.readFileSync(path.join(professionalDir,name),'utf8');
  assert(html.includes('b2b-context.js'),'b2b_context_script_missing:'+name);
}

console.log(
  'B2B knowledge contract: OK — '+
  contractSegments.length+' segments, '+
  contractNeeds.length+' needs, '+
  (MAISON_B2B_BRAIN.offerFamilies||[]).length+' offer families, '+
  (MAISON_B2B_BRAIN.professionalNetwork?.levels||[]).length+' network levels, '+
  (MAISON_B2B_BRAIN.researchCandidates||[]).length+' evidence-bounded research candidates, one shared MAISON graph.'
);
