import { validateOracleBlock } from './maison-content-ontology.js';
import { directOracleExperience } from './experience-director.js';
import { qualityCheckOracle } from './experience-quality.js';

export const ORACLE_COMPOSER_VERSION='oracle-composer-v1';

export function composeOracleReading({territory,seed,blocks,seenIds=[],requestedTone,requestedIntensity,maxAttempts=12}={}){
  if(!territory)throw new Error('territory_required');
  if(!seed)throw new Error('seed_required');
  if(!Array.isArray(blocks))throw new Error('oracle_blocks_required');

  const seen=new Set(seenIds);
  const valid=blocks.filter(block=>{
    const check=validateOracleBlock(block);
    return check.ok&&
      block.status==='active'&&
      (block.territory===territory||block.territory==='global')&&
      !['review','retired'].includes(block.rotationState||'normal')&&
      !['review','retired'].includes(block.lifecycleState||'live');
  });
  if(valid.length<5)throw new Error('insufficient_active_oracle_blocks');

  let best=null;
  for(let attempt=0;attempt<maxAttempts;attempt++){
    const attemptSeed=String(seed)+'|attempt:'+attempt;
    const plan=directOracleExperience({territory,seed:attemptSeed,requestedTone,requestedIntensity});
    try{
      const picked=pickForPlan({plan,valid,seen,seed:attemptSeed});
      const quality=qualityCheckOracle({blocks:picked,plan});
      const candidate={plan,blocks:picked,quality};
      if(!best||quality.score>best.quality.score)best=candidate;
      if(quality.ok)return finish(candidate,territory,seed);
    }catch{}
  }
  if(best?.quality?.score>=.72)return finish(best,territory,seed);
  throw new Error('oracle_quality_gate_failed');
}

function pickForPlan({plan,valid,seen,seed}){
  const rng=mulberry32(hashSeed(seed+'|composer-v1'));
  const used=[];
  for(let i=0;i<plan.roles.length;i++){
    const role=plan.roles[i];
    const targetIntensity=plan.roleIntensity[i]||plan.intensity;
    const eligibleAll=valid.filter(block=>
      block.role===role&&
      !used.some(x=>x.id===block.id)&&
      compatibleWithPlan(block,plan)&&
      compatibleWithPicked(block,used)&&
      Math.abs(Number(block.intensity||targetIntensity)-targetIntensity)<=2
    );
    if(!eligibleAll.length)throw new Error('insufficient_oracle_candidates_'+role);

    // Territory-specific editorial material always wins when it can fill this role.
    // Global blocks are a backbone/fallback for uncovered territories, not a dilution layer.
    const specific=eligibleAll.filter(block=>block.territory===territory);
    const eligible=specific.length?specific:eligibleAll.filter(block=>block.territory==='global');
    if(!eligible.length)throw new Error('insufficient_oracle_candidates_'+role);

    const unseen=eligible.filter(x=>!seen.has(x.id));
    const candidates=unseen.length?unseen:eligible;
    used.push(weightedPick(candidates,rng,block=>blockWeight(block,{seen,targetIntensity,plan})));
  }
  return used;
}

function compatibleWithPlan(block,plan){
  const c=block.compatibility||{};
  if(Array.isArray(c.trajectories)&&c.trajectories.length&&!c.trajectories.includes(plan.trajectory))return false;
  if(Array.isArray(c.tones)&&c.tones.length&&!c.tones.includes(plan.tone))return false;
  return !Array.isArray(c.forbiddenTrajectories)||!c.forbiddenTrajectories.includes(plan.trajectory);
}

function compatibleWithPicked(block,picked){
  const c=block.compatibility||{};
  const forbidden=new Set(c.forbiddenBlockIds||[]);
  const incompatibleFingerprints=new Set(c.incompatibleFingerprints||[]);
  for(const other of picked){
    if(forbidden.has(other.id))return false;
    if(other.semanticFingerprint&&incompatibleFingerprints.has(other.semanticFingerprint))return false;
    const oc=other.compatibility||{};
    if((oc.forbiddenBlockIds||[]).includes(block.id))return false;
    if(block.semanticFingerprint&&(oc.incompatibleFingerprints||[]).includes(block.semanticFingerprint))return false;
  }
  return true;
}

function blockWeight(block,{seen,targetIntensity,plan}){
  const s=block.scores||{};
  const quality=
    n(s.editorialQuality,3)*.20+
    n(s.humanity,3)*.14+
    n(s.specificity,3)*.12+
    n(s.clarity,3)*.10+
    n(s.originality,3)*.10+
    n(s.emotionalTruth,3)*.12+
    n(s.composability,3)*.17+
    n(s.safety,3)*.05;
  const intensityFit=Math.max(.2,1-Math.abs(Number(block.intensity||targetIntensity)-targetIntensity)*.22);
  const toneFit=!block.tone||block.tone===plan.tone?1:.78;
  const seenWeight=seen.has(block.id)?.08:1;
  const served=Number(block.metrics?.served||0);
  const freshness=served?Math.max(.55,1/Math.log10(served+10)):1;
  const rotation={new:.22,limited:.48,normal:1,review:.05,retired:0}[block.rotationState||'normal']??1;
  const rarity={common:1,uncommon:.42,rare:.14}[block.rarity||'common']??1;
  return Math.max(.001,quality*intensityFit*toneFit*seenWeight*freshness*rotation*rarity);
}

function finish(candidate,territory,seed){
  const title=candidate.blocks.find(x=>x.role==='opening')?.title||'Uma abertura';
  return {
    engineVersion:ORACLE_COMPOSER_VERSION,
    directorVersion:candidate.plan.directorVersion,
    qualityVersion:candidate.quality.qualityVersion,
    territory,
    seed:String(seed),
    trajectory:candidate.plan.trajectory,
    tone:candidate.plan.tone,
    intensity:candidate.plan.intensity,
    title,
    text:candidate.blocks.map(x=>String(x.text||'').trim()).filter(Boolean).join('\n\n'),
    blocks:candidate.blocks,
    ids:candidate.blocks.map(x=>x.id),
    quality:candidate.quality
  };
}

function weightedPick(items,rng,weightFn){
  const weights=items.map(x=>Math.max(.0001,Number(weightFn(x))||.0001));
  const total=weights.reduce((a,b)=>a+b,0);
  let roll=rng()*total;
  for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<=0)return items[i]}
  return items[items.length-1];
}
function n(value,fallback){return typeof value==='number'&&Number.isFinite(value)?value:fallback}
function hashSeed(input){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
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
