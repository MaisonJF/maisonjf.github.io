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

assert(MAISON_B2B_BRAIN.evidencePolicy?.noSyntheticDemand,'b2b_evidence_policy_missing');
assert(MAISON_B2B_BRAIN.routes.some(x=>x.role==='lead'),'b2b_lead_route_missing');
assert((graph.professionalLayer.researchCandidates||[]).length===(MAISON_B2B_BRAIN.researchCandidates||[]).length,'b2b_research_candidate_projection_drift');
for(const candidate of MAISON_B2B_BRAIN.researchCandidates||[]){
  assert(candidate.status!=='market_demand_proven','unsupported_market_demand_claim:'+candidate.id);
  assert(candidate.claimLimit,'research_candidate_claim_limit_missing:'+candidate.id);
  assert(Array.isArray(candidate.evidence)&&candidate.evidence.length>=2,'research_candidate_cross_source_evidence_missing:'+candidate.id);
}

for(const segment of MAISON_B2B_BRAIN.segments){
  assert(segment.status==='public_validated','unexpected_professional_segment_status:'+segment.id);
  assert(Array.isArray(segment.routes)&&segment.routes.length>0,'professional_segment_route_missing:'+segment.id);
}

console.log('B2B knowledge contract: OK — '+contractSegments.length+' segments, '+contractNeeds.length+' needs, '+(MAISON_B2B_BRAIN.researchCandidates||[]).length+' evidence-bounded research candidates, one shared MAISON graph.');
