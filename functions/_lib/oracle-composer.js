import { validateOracleBlock } from './maison-content-ontology.js';
import { directOracleExperience } from './experience-director.js';
import { qualityCheckOracle } from './experience-quality.js';
import { normalizeMaisonLocale } from './maison-locales.js';

export const ORACLE_COMPOSER_VERSION='oracle-composer-v2';

export function composeOracleReading({territory,seed,blocks,seenIds=[],locale='pt-PT'}={}){
  if(!territory||!seed||!Array.isArray(blocks))throw new Error('oracle_input_required');
  const valid=blocks.filter(block=>validateOracleBlock(block).ok && block.status==='active' &&
    (block.territory===territory||block.territory==='global') &&
    !['review','retired'].includes(block.rotationState||'normal') &&
    !['review','retired'].includes(block.lifecycleState||'live') && String(block.text||'').trim());
  if(!valid.length)throw new Error('insufficient_active_oracle_blocks');
  const rng=mulberry32(hashSeed(String(seed)));
  const seen=new Set(seenIds);
  const specific=valid.filter(block=>block.territory===territory);
  const pool=specific.length?specific:valid;
  const fresh=pool.filter(block=>!seen.has(block.id));
  const candidates=fresh.length?fresh:pool;
  const chosen=weightedPick(candidates,rng,block=>Math.max(.01,Number(block.scores?.editorialQuality||3)));
  const selectedLocale=normalizeMaisonLocale(locale);
  const fallbackTitle={'pt-PT':'Uma abertura','pt-BR':'Uma leitura',en:'A reading',es:'Una lectura'}[selectedLocale]||'Uma leitura';
  return {
    engineVersion:'oracle-composer-v3',directorVersion:'simple-v1',qualityVersion:'editorial-v1',
    territory,seed:String(seed),trajectory:'symbolic',tone:chosen.tone||'intimate',intensity:Number(chosen.intensity||3),
    title:chosen.title||fallbackTitle,text:String(chosen.text).trim(),blocks:[chosen],ids:[chosen.id],
    quality:{ok:true,score:1,qualityVersion:'editorial-v1'}
  };
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

function finish(candidate,territory,seed,locale='pt-PT'){
  const normalizedLocale=normalizeMaisonLocale(locale);
  const fallbackTitle={'pt-PT':'Uma abertura','pt-BR':'Uma leitura',en:'A reading',es:'Una apertura'}[normalizedLocale]||'Uma leitura';
  const title=candidate.blocks.find(x=>x.role==='opening')?.title||fallbackTitle;
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
