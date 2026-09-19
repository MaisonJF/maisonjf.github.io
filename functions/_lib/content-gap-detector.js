/*
MAISON JF® · Content Gap Detector
Detects minimum healthy coverage. Floors are not catalogue caps.
Returned needs are proposals for the Brain/Oceans loop, never automatic publication.
*/

export const CONTENT_GAP_VERSION='content-gap-v1';

const ORACLE_FLOORS={
  opening:8,
  recognition:10,
  tension:8,
  counterpoint:8,
  reframe:10,
  movement:8,
  close:8
};

const QUESTION_STAGE_FLOORS={
  open:12,
  recognize:12,
  deepen:12,
  touch:12,
  close:6,
  signature:6
};

export function detectOracleContentNeeds({territory,blocks=[],floors=ORACLE_FLOORS}={}){
  if(!territory)throw new Error('territory_required');
  const active=blocks.filter(x=>
    (x.territory===territory||x.territory==='global')&&
    x.status==='active'&&
    !['review','retired'].includes(x.rotationState||'normal')
  );
  const counts=countBy(active,'role');
  const needs=[];
  for(const [role,floor] of Object.entries(floors)){
    const have=counts[role]||0;
    if(have>=floor)continue;
    const missing=floor-have;
    needs.push({
      targetType:'oracle_block',
      territory,
      stageOrRole:role,
      reasonCode:'coverage_gap',
      priority:priority(missing,floor),
      metadata:{have,minimumHealthy:floor,missing,gapVersion:CONTENT_GAP_VERSION}
    });
  }
  return needs.sort((a,b)=>b.priority-a.priority);
}

export function detectQuestionContentNeeds({theme,questions=[],floors=QUESTION_STAGE_FLOORS}={}){
  if(!theme)throw new Error('theme_required');
  const active=questions.filter(x=>
    x.theme===theme&&
    x.status==='active'&&
    x.exposure==='paid'&&
    !['review','retired'].includes(x.rotationState||'normal')
  );
  const counts=countBy(active,'stage');
  const needs=[];
  for(const [stage,floor] of Object.entries(floors)){
    const have=counts[stage]||0;
    if(have>=floor)continue;
    const missing=floor-have;
    needs.push({
      targetType:'question',
      territory:theme,
      stageOrRole:stage,
      reasonCode:'coverage_gap',
      priority:priority(missing,floor),
      metadata:{have,minimumHealthy:floor,missing,gapVersion:CONTENT_GAP_VERSION}
    });
  }

  const targets=countBy(active,'target');
  for(const target of ['self','partner','both','prediction']){
    const have=targets[target]||0;
    if(have>=6)continue;
    needs.push({
      targetType:'question',
      territory:theme,
      reasonCode:'target_mix_gap',
      priority:Math.max(35,70-have*6),
      metadata:{target,have,minimumHealthy:6,gapVersion:CONTENT_GAP_VERSION}
    });
  }
  return needs.sort((a,b)=>b.priority-a.priority);
}

function countBy(items,key){
  const out={};
  for(const item of items){
    const value=item?.[key];
    if(!value)continue;
    out[value]=(out[value]||0)+1;
  }
  return out;
}
function priority(missing,floor){
  return Math.max(30,Math.min(100,Math.round(40+(missing/Math.max(1,floor))*60)));
}
