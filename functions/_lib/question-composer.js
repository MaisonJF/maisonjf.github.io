import { validateQuestionCard } from './maison-content-ontology.js';
import { PARA_DE_IGNORAR_PACK_TEMPLATE } from './para-de-ignorar-policy.js';
import { directQuestionExperience } from './experience-director.js';
import { qualityCheckQuestionPacks } from './experience-quality.js';

/*
Question Composer
- deterministic for a given seed + repertoire + seen history
- composes two balanced 14-card packs
- randomizes only inside editorial constraints
- never stores or needs answer text
- validates the complete 28-card experience before returning it
*/

export function composeQuestionSession({
  theme,
  seed,
  questions,
  seenIds=[],
  mode='balanced',
  packTemplate=PARA_DE_IGNORAR_PACK_TEMPLATE,
  maxAttempts=10
}={}){
  if(!theme)throw new Error('theme_required');
  if(!seed)throw new Error('seed_required');
  if(!Array.isArray(questions))throw new Error('questions_required');

  const seen=new Set(seenIds);
  const valid=questions.filter(card=>{
    const check=validateQuestionCard(card);
    return check.ok &&
      card.theme===theme &&
      card.status==='active' &&
      card.exposure==='paid' &&
      !['review','retired'].includes(card.rotationState||'normal') &&
      !['review','retired'].includes(card.lifecycleState||'live');
  });
  if(valid.length<28)throw new Error('insufficient_active_paid_questions');

  const director=directQuestionExperience({theme,seed,mode});
  let best=null;

  for(let attempt=0;attempt<maxAttempts;attempt++){
    try{
      const candidate=buildAttempt(attempt);
      if(!best||candidate.quality.score>best.quality.score)best=candidate;
      if(candidate.quality.ok)return finish(candidate);
    }catch{}
  }

  if(best?.quality?.score>=.72)return finish(best);
  throw new Error('question_quality_gate_failed');

  function buildAttempt(attempt){
    const rng=mulberry32(hashSeed(String(seed)+'|'+theme+'|v3|'+attempt));
    const used=new Set();
    const signatureGroups=new Set();
    const packA=buildPack('A');
    const packB=buildPack('B');
    const quality=qualityCheckQuestionPacks({packA,packB});
    return {packA,packB,quality};

    function buildPack(label){
      return packTemplate.map(slot=>{
        const eligible=valid.filter(card=>
          !used.has(card.id) &&
          card.stage===slot.stage &&
          card.intensity>=slot.minIntensity &&
          card.intensity<=slot.maxIntensity &&
          !hasConflict(card,used,valid) &&
          (!card.similarityGroup||!signatureGroups.has(card.similarityGroup))
        );
        if(!eligible.length){
          throw new Error('insufficient_candidates_for_'+label+'_'+slot.position+'_'+slot.stage);
        }
        const unseenEligible=eligible.filter(card=>!seen.has(card.id));
        const candidates=unseenEligible.length ? unseenEligible : eligible;
        const picked=weightedPick(candidates,rng,cardWeight);
        used.add(picked.id);
        if(picked.similarityGroup)signatureGroups.add(picked.similarityGroup);
        return picked;
      });
    }
  }

  function cardWeight(card){
    const s=card.scores||{};
    const quality=
      n(s.editorialQuality,3)*0.24+
      n(s.conversationValue,3)*0.20+
      n(s.humanity,3)*0.10+
      n(s.specificity,3)*0.08+
      n(s.composability,3)*0.08+
      n(s.kiss,3)*0.10+
      n(s.feral,3)*0.07+
      n(s.barnum,3)*0.05+
      n(s.viral,3)*0.04+
      n(s.safety,3)*0.04;
    const unseen=seen.has(card.id)?0.12:1;
    const shown=Number(card.metrics?.shown||0);
    const fresh=shown?Math.max(.60,1/Math.log10(shown+10)):1;
    const rotation={new:.24,limited:.50,normal:1,review:.05,retired:0}[card.rotationState||'normal']??1;
    return Math.max(.01,quality*unseen*fresh*rotation);
  }

  function finish(candidate){
    return {
      engineVersion:'question-composer-v3',
      directorVersion:director.directorVersion,
      qualityVersion:candidate.quality.qualityVersion,
      qualityScore:candidate.quality.score,
      mode:director.mode,
      theme,
      seed:String(seed),
      packA:candidate.packA,
      packB:candidate.packB,
      ids:[...candidate.packA,...candidate.packB].map(card=>card.id)
    };
  }
}

function hasConflict(card,used,all){
  const conflicts=new Set(card.conflictsWith||[]);
  if(!conflicts.size)return false;
  for(const id of used)if(conflicts.has(id))return true;
  for(const other of all){
    if(!used.has(other.id))continue;
    if((other.conflictsWith||[]).includes(card.id))return true;
  }
  return false;
}

function weightedPick(items,rng,weightFn){
  const weights=items.map(x=>Math.max(.0001,Number(weightFn(x))||.0001));
  const total=weights.reduce((a,b)=>a+b,0);
  let roll=rng()*total;
  for(let i=0;i<items.length;i++){
    roll-=weights[i];
    if(roll<=0)return items[i];
  }
  return items[items.length-1];
}

function n(value,fallback){return typeof value==='number'&&Number.isFinite(value)?value:fallback}

function hashSeed(input){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){
    h^=input.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function mulberry32(seed){
  return function(){
    let t=seed+=0x6D2B79F5;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
