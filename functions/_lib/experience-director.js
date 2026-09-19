/*
MAISON JF® · Experience Director
Chooses the emotional route before any paid text is selected.
No user answers or private conversation content are accepted here.
*/

export const EXPERIENCE_DIRECTOR_VERSION='experience-director-v1';

export const ORACLE_TRAJECTORIES=[
  {id:'recognition_relief',roles:['opening','recognition','tension','reframe','movement','close'],tones:['gentle','intimate','clear'],intensity:[1,2,2,2,2,1],ending:'relief',delta:{confusion:-2,agency:2}},
  {id:'recognition_confront_reframe',roles:['opening','recognition','tension','counterpoint','reframe','close'],tones:['direct','intimate','clear'],intensity:[1,2,3,3,2,2],ending:'reframe',delta:{confusion:-2,agency:1}},
  {id:'confusion_clarity',roles:['opening','recognition','counterpoint','reframe','movement','close'],tones:['clear','gentle','direct'],intensity:[1,2,2,2,2,1],ending:'clarity',delta:{confusion:-3,agency:1}},
  {id:'tension_truth_movement',roles:['opening','tension','counterpoint','reframe','movement','close'],tones:['direct','clear','confrontational'],intensity:[2,3,3,3,3,2],ending:'movement',delta:{confusion:-2,agency:3}},
  {id:'wound_protection_possibility',roles:['opening','recognition','tension','reframe','close'],tones:['gentle','intimate'],intensity:[1,2,3,2,1],ending:'possibility',delta:{fear:-1,agency:1}},
  {id:'pattern_responsibility_choice',roles:['opening','recognition','tension','counterpoint','movement','close'],tones:['direct','clear'],intensity:[1,2,3,3,3,2],ending:'choice',delta:{agency:3}},
  {id:'desire_fear_permission',roles:['opening','recognition','tension','counterpoint','reframe','close'],tones:['intimate','gentle','direct'],intensity:[1,2,3,2,2,1],ending:'permission',delta:{fear:-1,agency:2}},
  {id:'block_next_step',roles:['opening','recognition','counterpoint','reframe','movement','close'],tones:['clear','direct','gentle'],intensity:[1,2,2,2,3,2],ending:'next_step',delta:{confusion:-2,agency:3}},
  {id:'intuition_resistance',roles:['opening','recognition','tension','counterpoint','reframe','close'],tones:['intimate','clear','gentle'],intensity:[1,2,2,2,2,1],ending:'recognition',delta:{confusion:-2}},
  {id:'mirror',roles:['opening','recognition','tension','reframe','close'],tones:['intimate','clear'],intensity:[1,2,2,2,1],ending:'reflection',delta:{confusion:-1}}
];

export const QUESTION_SESSION_MODES={
  balanced:{id:'balanced',curve:['land','curiosity','deepen','vulnerability','reveal','integrate','close'],maxConflict:4},
  playful:{id:'playful',curve:['land','curiosity','play','deepen','reveal','integrate','close'],maxConflict:3},
  deep:{id:'deep',curve:['land','curiosity','deepen','vulnerability','reveal','integrate','close'],maxConflict:5},
  reconnect:{id:'reconnect',curve:['land','recognize','memory','vulnerability','repair','integrate','close'],maxConflict:4},
  honest:{id:'honest',curve:['land','contrast','deepen','vulnerability','reveal','integrate','close'],maxConflict:5},
  memory:{id:'memory',curve:['land','memory','recognize','contrast','reveal','integrate','close'],maxConflict:3},
  future:{id:'future',curve:['land','curiosity','desire','contrast','choice','integrate','close'],maxConflict:4},
  desire:{id:'desire',curve:['land','curiosity','desire','vulnerability','reveal','integrate','close'],maxConflict:4},
  things_unsaid:{id:'things_unsaid',curve:['land','recognize','deepen','vulnerability','reveal','integrate','close'],maxConflict:5}
};

export function directOracleExperience({territory,seed,requestedTone,requestedIntensity}={}){
  if(!territory)throw new Error('territory_required');
  if(!seed)throw new Error('seed_required');
  const rng=mulberry32(hashSeed(String(seed)+'|'+territory+'|director-v1'));
  const trajectory=ORACLE_TRAJECTORIES[Math.floor(rng()*ORACLE_TRAJECTORIES.length)];
  const tone=requestedTone&&trajectory.tones.includes(requestedTone)
    ?requestedTone
    :trajectory.tones[Math.floor(rng()*trajectory.tones.length)];
  const intensity=clamp(
    requestedIntensity==null?Math.round(avg(trajectory.intensity)):Number(requestedIntensity),
    1,5
  );
  return {
    directorVersion:EXPERIENCE_DIRECTOR_VERSION,
    product:'oracle',
    territory,
    trajectory:trajectory.id,
    roles:[...trajectory.roles],
    roleIntensity:[...trajectory.intensity],
    tone,
    intensity,
    targetEnding:trajectory.ending,
    emotionalDelta:{...trajectory.delta}
  };
}

export function directQuestionExperience({theme,seed,mode='balanced'}={}){
  if(!theme)throw new Error('theme_required');
  if(!seed)throw new Error('seed_required');
  const selected=QUESTION_SESSION_MODES[mode]||QUESTION_SESSION_MODES.balanced;
  return {
    directorVersion:EXPERIENCE_DIRECTOR_VERSION,
    product:'para_de_ignorar',
    theme,
    mode:selected.id,
    curve:[...selected.curve],
    maxConflict:selected.maxConflict
  };
}

function avg(values){return values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)}
function clamp(value,min,max){return Math.min(max,Math.max(min,Number.isFinite(value)?value:min))}
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
