import { semanticSimilarity } from './experience-quality.js';

/*
MAISON JF® · Taxonomy Gate
A candidate is routed to one of three editorial destinations:
- new_territory
- subterritory
- depth
It never publishes content and never activates paid material.
*/

export const TAXONOMY_GATE_VERSION='taxonomy-gate-v1';

export function decideTaxonomyPlacement({candidate,existingNodes=[]}={}){
  if(!candidate||typeof candidate!=='object')throw new Error('candidate_required');
  const text=candidateText(candidate);
  if(!text)throw new Error('candidate_text_required');

  const neighbours=(existingNodes||[]).map(node=>({
    node,
    similarity:nodeSimilarity(candidate,node)
  })).sort((a,b)=>b.similarity-a.similarity);
  const nearest=neighbours[0]||null;

  if(nearest?.similarity>=.86){
    return decision('depth',candidate,nearest,'semantic_overlap_high',{
      mergeSuggested:true,
      reviewRequired:true
    });
  }

  if(nearest?.node?.nodeType==='territory'&&nearest.similarity>=.64){
    const distinctiveness=n(candidate.distinctiveness,.5);
    if(distinctiveness>=.45){
      return decision('subterritory',candidate,nearest,'distinct_nuance_inside_existing_territory',{
        parentNodeId:nearest.node.nodeId,
        reviewRequired:true
      });
    }
    return decision('depth',candidate,nearest,'insufficient_distinctiveness_for_subterritory',{
      reviewRequired:true
    });
  }

  const utility=n(candidate.editorialUtility,.5);
  const expansion=n(candidate.expansionPotential,.5);
  const oracleFit=n(candidate.productFit?.oracle,0);
  const questionFit=n(candidate.productFit?.questions,0);
  const productFit=Math.max(oracleFit,questionFit);

  if(utility>=.68&&expansion>=.62&&productFit>=.55){
    return decision('new_territory',candidate,nearest,'distinct_expandable_product_relevant',{
      reviewRequired:true
    });
  }

  return decision('depth',candidate,nearest,'not_strong_enough_for_new_taxonomy_node',{
    reviewRequired:true,
    holdForMoreEvidence:!nearest
  });
}

function decision(destination,candidate,nearest,reason,extra={}){
  return {
    gateVersion:TAXONOMY_GATE_VERSION,
    destination,
    candidateId:candidate.id||candidate.candidateId||null,
    nearestNodeId:nearest?.node?.nodeId||null,
    nearestSimilarity:nearest?round(nearest.similarity):null,
    reasonCode:reason,
    ...extra
  };
}

function nodeSimilarity(candidate,node){
  if(candidate.semanticFingerprint&&node.semanticFingerprint&&candidate.semanticFingerprint===node.semanticFingerprint)return 1;
  return semanticSimilarity(candidateText(candidate),nodeText(node));
}
function candidateText(c){
  return [c.label,c.canonicalLabel,c.painLanguage,c.intent,c.description,(c.tags||[]).join(' ')].filter(Boolean).join(' ');
}
function nodeText(n){
  const m=n.metadata||{};
  return [n.canonicalLabel,n.label,m.description,m.painLanguage,m.intent,(m.tags||[]).join(' ')].filter(Boolean).join(' ');
}
function n(value,fallback){
  const x=Number(value);
  return Number.isFinite(x)?Math.max(0,Math.min(1,x)):fallback;
}
function round(value){return Math.round(value*1000)/1000}
