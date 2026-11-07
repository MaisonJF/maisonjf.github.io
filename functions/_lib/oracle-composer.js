import { validateOracleBlock } from './maison-content-ontology.js';
import { normalizeMaisonLocale } from './maison-locales.js';

export const ORACLE_COMPOSER_VERSION='oracle-composer-v3';

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
    engineVersion:ORACLE_COMPOSER_VERSION,directorVersion:'simple-v1',qualityVersion:'editorial-v1',
    territory,seed:String(seed),trajectory:'symbolic',tone:chosen.tone||'intimate',intensity:Number(chosen.intensity||3),
    title:chosen.title||fallbackTitle,text:String(chosen.text).trim(),blocks:[chosen],ids:[chosen.id],
    quality:{ok:true,score:1,qualityVersion:'editorial-v1'}
  };
}

function weightedPick(items,rng,weightFn){
  const weights=items.map(x=>Math.max(.0001,Number(weightFn(x))||.0001));
  const total=weights.reduce((a,b)=>a+b,0);
  let roll=rng()*total;
  for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<=0)return items[i]}
  return items[items.length-1];
}
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
