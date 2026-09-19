/*
MAISON JF® · Experience Quality Gate
Cheap deterministic checks before a composed experience is served.
This is editorial validation, not psychological diagnosis.
*/

export const EXPERIENCE_QUALITY_VERSION='experience-quality-v1';

const STOP=new Set('a o as os um uma uns umas de do da dos das e ou em no na nos nas por para com sem que se te tu eu ele ela eles elas isto isso aquilo ao aos à às é são ser estar já mais menos muito muita muito muito como quando onde porque mas nem também ainda'.split(/\s+/));

export function qualityCheckOracle({blocks,plan}={}){
  const issues=[],warnings=[];
  if(!Array.isArray(blocks)||!blocks.length)return fail(['oracle_blocks_required']);
  const ids=blocks.map(x=>x.id);
  if(new Set(ids).size!==ids.length)issues.push('duplicate_block_id');
  if(plan?.roles&&blocks.map(x=>x.role).join('|')!==plan.roles.join('|'))issues.push('trajectory_role_mismatch');

  for(let i=0;i<blocks.length;i++){
    const b=blocks[i];
    const style=styleGuard(b.text);
    issues.push(...style.hard.map(x=>'block_'+i+'_'+x));
    warnings.push(...style.soft.map(x=>'block_'+i+'_'+x));
    if(i){
      const prev=blocks[i-1];
      if(Math.abs(Number(b.intensity||1)-Number(prev.intensity||1))>2)issues.push('intensity_jump_'+i);
      if(isForbiddenPair(prev,b))issues.push('forbidden_pair_'+i);
    }
  }

  for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
    if(sameFingerprint(blocks[i],blocks[j]))issues.push('semantic_duplicate_'+i+'_'+j);
    else if(semanticSimilarity(blocks[i].text,blocks[j].text)>=.82)issues.push('text_duplicate_'+i+'_'+j);
  }

  const score=scoreFrom(issues,warnings);
  return {ok:issues.length===0,score,issues,warnings,qualityVersion:EXPERIENCE_QUALITY_VERSION};
}

export function qualityCheckQuestionPacks({packA,packB}={}){
  const issues=[],warnings=[];
  const cards=[...(packA||[]),...(packB||[])];
  if(cards.length!==28)issues.push('question_count_not_28');
  const ids=cards.map(x=>x.id);
  if(new Set(ids).size!==ids.length)issues.push('duplicate_question_id');

  for(const pack of [packA||[],packB||[]]){
    let highRun=0;
    for(let i=0;i<pack.length;i++){
      const card=pack[i];
      const style=styleGuard(card.text,{question:true});
      issues.push(...style.hard.map(x=>'question_'+card.id+'_'+x));
      warnings.push(...style.soft.map(x=>'question_'+card.id+'_'+x));
      highRun=Number(card.intensity)>=4?highRun+1:0;
      if(highRun>4)warnings.push('high_intensity_run');
      if(i&&Math.abs(Number(card.intensity||1)-Number(pack[i-1].intensity||1))>2)warnings.push('question_intensity_jump');
    }
  }

  for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
    if(sameFingerprint(cards[i],cards[j]))issues.push('question_semantic_duplicate');
    else if(semanticSimilarity(cards[i].text,cards[j].text)>=.9)issues.push('question_text_duplicate');
  }

  return {ok:issues.length===0,score:scoreFrom(issues,warnings),issues,warnings,qualityVersion:EXPERIENCE_QUALITY_VERSION};
}

export function styleGuard(text,{question=false}={}){
  const value=String(text||'').trim();
  const hard=[],soft=[];
  if(!value)hard.push('empty');
  if(/\b(vai acontecer|vai certamente|é garantido|está destinado|o destino decidiu)\b/i.test(value))hard.push('absolute_future_claim');
  if(/\bo universo\s+(quer|manda|pede|exige|garante)\b/i.test(value))hard.push('universe_as_authority');
  if(/\b(tens|sofre[s]? de)\s+(depress[aã]o|ansiedade|trauma|transtorno|perturba[cç][aã]o|narcisismo)\b/i.test(value))hard.push('diagnostic_language');
  if(!question&&value.length>1200)soft.push('too_verbose');
  if(question&&value.length>360)soft.push('question_too_verbose');
  if(/\bsempre\b.*\bnunca\b|\bnunca\b.*\bsempre\b/i.test(value))soft.push('absolute_language');
  return {hard,soft};
}

export function semanticSimilarity(a,b){
  const A=tokens(a),B=tokens(b);
  if(!A.size||!B.size)return 0;
  let intersection=0;
  for(const token of A)if(B.has(token))intersection++;
  const union=A.size+B.size-intersection;
  return union?intersection/union:0;
}

function tokens(value){
  return new Set(String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)));
}
function sameFingerprint(a,b){
  return !!a?.semanticFingerprint&&a.semanticFingerprint===b?.semanticFingerprint;
}
function isForbiddenPair(a,b){
  const ac=a?.compatibility||{},bc=b?.compatibility||{};
  return (ac.forbiddenBlockIds||[]).includes(b?.id)||(bc.forbiddenBlockIds||[]).includes(a?.id);
}
function scoreFrom(issues,warnings){
  return Math.max(0,Math.round((1-Math.min(.9,issues.length*.18+warnings.length*.025))*100)/100);
}
function fail(issues){return {ok:false,score:0,issues,warnings:[],qualityVersion:EXPERIENCE_QUALITY_VERSION}}
