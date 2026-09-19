/*
Maison Brain Bridge
Transforms abstract, privacy-reviewed Ocean/Brain signals into internal
editorial candidates. It never creates paid content or public pages.
*/

export function contentCandidatesFromSignal(signal={}){
  const safe=normalizeSignal(signal);
  const out=[];
  if(safe.themePotential===true){
    out.push({
      type:'theme_candidate',
      status:'candidate',
      source:'maison-brain',
      themeCandidates:safe.questionThemeCandidates,
      painLanguage:safe.painLanguage,
      territory:safe.territory,
      intent:safe.intent,
      evidence:safe.evidence,
      publicSideEffects:false,
      automaticActivation:false
    });
  }
  if(safe.questionPotential===true){
    out.push({
      type:'question_candidate',
      status:'candidate',
      source:'maison-brain',
      themeCandidates:safe.questionThemeCandidates,
      painLanguage:safe.painLanguage,
      territory:safe.territory,
      intent:safe.intent,
      evidence:safe.evidence,
      publicSideEffects:false
    });
  }
  if(safe.oraclePotential===true){
    out.push({
      type:'oracle_candidate',
      status:'candidate',
      source:'maison-brain',
      territory:safe.territory,
      intent:safe.intent,
      painLanguage:safe.painLanguage,
      evidence:safe.evidence,
      publicSideEffects:false
    });
  }
  return out;
}

function normalizeSignal(signal){
  const text=v=>typeof v==='string'?v.trim().slice(0,500):'';
  const list=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').map(x=>x.slice(0,120)).slice(0,12):[];
  return {
    painLanguage:text(signal.painLanguage),
    territory:text(signal.territory),
    intent:text(signal.intent),
    themePotential:signal.themePotential===true,
    questionPotential:signal.questionPotential===true,
    oraclePotential:signal.oraclePotential===true,
    questionThemeCandidates:list(signal.questionThemeCandidates),
    evidence:list(signal.evidence)
  };
}
