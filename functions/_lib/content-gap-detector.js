/*
MAISON JF® · Content Gap / Continuous Growth Detector
Healthy floors protect breadth. Once a floor is reached the detector keeps
opening deliberately bounded depth milestones; there is no catalogue cap.
Returned needs feed Brain/Oceans and never bypass editorial/quality gates.
*/

export const CONTENT_GAP_VERSION='content-gap-v2-continuous';

const ORACLE_FLOORS={
  opening:8,
  recognition:10,
  tension:8,
  counterpoint:8,
  reframe:10,
  movement:8,
  close:8
};

const ORACLE_GROWTH_STEP={
  opening:4,
  recognition:5,
  tension:4,
  counterpoint:4,
  reframe:5,
  movement:4,
  close:4
};

const QUESTION_STAGE_FLOORS={
  // 300 questions is the healthy-depth floor for a mature paid theme.
  // It is deliberately not a target ceiling.
  open:60,
  recognize:60,
  deepen:60,
  touch:60,
  close:30,
  signature:30
};

const QUESTION_STAGE_GROWTH_STEP={
  // Every completed milestone opens the next 100-question depth tranche.
  open:20,
  recognize:20,
  deepen:20,
  touch:20,
  close:10,
  signature:10
};

export function detectOracleContentNeeds({territory,blocks=[],floors=ORACLE_FLOORS}={}){
  if(!territory)throw new Error('territory_required');
  const active=blocks.filter(x=>
    x.territory===territory&&
    x.status==='active'&&
    !['review','retired'].includes(x.rotationState||'normal')
  );
  const globalSupport=blocks.filter(x=>
    x.territory==='global'&&
    x.status==='active'&&
    !['review','retired'].includes(x.rotationState||'normal')
  );
  const counts=countBy(active,'role');
  const globalCounts=countBy(globalSupport,'role');
  const needs=[];
  for(const [role,floor] of Object.entries(floors)){
    const have=counts[role]||0;
    if(have<floor){
      const missing=floor-have;
      needs.push({
        targetType:'oracle_block',territory,stageOrRole:role,reasonCode:'coverage_gap',
        priority:priority(missing,floor),
        metadata:{have,minimumHealthy:floor,nextMilestone:floor,missing,continuousGrowth:true,catalogueCap:null,globalSupport:globalCounts[role]||0,gapVersion:CONTENT_GAP_VERSION}
      });
      continue;
    }
    const step=Math.max(1,Number(ORACLE_GROWTH_STEP[role]||4));
    const nextMilestone=nextGrowthMilestone(have,floor,step);
    needs.push({
      targetType:'oracle_block',territory,stageOrRole:role,reasonCode:'continuous_depth',
      priority:continuousPriority(have,nextMilestone),
      metadata:{have,minimumHealthy:floor,nextMilestone,missing:nextMilestone-have,growthStep:step,continuousGrowth:true,catalogueCap:null,globalSupport:globalCounts[role]||0,gapVersion:CONTENT_GAP_VERSION}
    });
  }
  return needs.sort((a,b)=>b.priority-a.priority);
}

export function detectQuestionContentNeeds({theme,questions=[],floors=QUESTION_STAGE_FLOORS}={}){
  if(!theme)throw new Error('theme_required');
  const active=questions.filter(x=>
    x.theme===theme&&x.status==='active'&&x.exposure==='paid'&&
    !['review','retired'].includes(x.rotationState||'normal')
  );
  const counts=countBy(active,'stage');
  const needs=[];
  for(const [stage,floor] of Object.entries(floors)){
    const have=counts[stage]||0;
    if(have<floor){
      const missing=floor-have;
      needs.push({
        targetType:'question',territory:theme,stageOrRole:stage,reasonCode:'coverage_gap',
        priority:priority(missing,floor),
        metadata:{have,minimumHealthy:floor,nextMilestone:floor,missing,continuousGrowth:true,catalogueCap:null,gapVersion:CONTENT_GAP_VERSION}
      });
      continue;
    }
    const step=Math.max(1,Number(QUESTION_STAGE_GROWTH_STEP[stage]||10));
    const nextMilestone=nextGrowthMilestone(have,floor,step);
    needs.push({
      targetType:'question',territory:theme,stageOrRole:stage,reasonCode:'continuous_depth',
      priority:continuousPriority(have,nextMilestone),
      metadata:{have,minimumHealthy:floor,nextMilestone,missing:nextMilestone-have,growthStep:step,continuousGrowth:true,catalogueCap:null,gapVersion:CONTENT_GAP_VERSION}
    });
  }

  const targets=countBy(active,'target');
  for(const target of ['self','partner','both','prediction']){
    const have=targets[target]||0;
    if(have>=6)continue;
    needs.push({
      targetType:'question',territory:theme,reasonCode:'target_mix_gap',
      priority:Math.max(35,70-have*6),
      metadata:{target,have,minimumHealthy:6,continuousGrowth:true,catalogueCap:null,gapVersion:CONTENT_GAP_VERSION}
    });
  }
  return needs.sort((a,b)=>b.priority-a.priority);
}

function nextGrowthMilestone(have,floor,step){
  const completed=Math.floor(Math.max(0,have-floor)/step);
  return floor+(completed+1)*step;
}
function continuousPriority(have,nextMilestone){
  const remaining=Math.max(1,nextMilestone-have);
  const span=Math.max(1,nextMilestone);
  return Math.max(25,Math.min(45,Math.round(28+(remaining/span)*100)));
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
