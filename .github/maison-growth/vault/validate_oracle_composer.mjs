import { composeOracleReading } from '../../../functions/_lib/oracle-composer.js';

const roles=['opening','recognition','tension','counterpoint','reframe','movement','close'];

function block({id,territory,role,intensity=2}){
  return {
    id,
    canonicalKey:id,
    territory,
    role,
    intensity,
    text:`Texto editorial ${id} com clareza suficiente para teste.`,
    title:role==='opening'?'Teste':undefined,
    status:'active',
    lifecycleState:'live',
    rotationState:'normal',
    rarity:'common',
    compatibility:{},
    scores:{
      editorialQuality:4.5,humanity:4.5,specificity:4.2,clarity:4.6,
      originality:4.2,emotionalTruth:4.5,composability:4.8,safety:5
    }
  };
}

const specific=[];
const global=[];
for(const role of roles){
  specific.push(block({id:`ob_amor_${role}_1`,territory:'amor',role,intensity:role==='tension'?3:2}));
  specific.push(block({id:`ob_amor_${role}_2`,territory:'amor',role,intensity:role==='tension'?3:2}));
  global.push(block({id:`ob_global_${role}_1`,territory:'global',role,intensity:2}));
  global.push(block({id:`ob_global_${role}_2`,territory:'global',role,intensity:2}));
}

for(let i=0;i<20;i++){
  const out=composeOracleReading({
    territory:'amor',
    seed:'territory-priority-'+i,
    blocks:[...specific,...global]
  });
  if(out.blocks.some(b=>b.territory!=='amor')){
    throw new Error('global block selected despite complete territory-specific coverage');
  }
}

const noMovement=specific.filter(b=>b.role!=='movement');
let sawGlobalMovement=false;
for(let i=0;i<30;i++){
  const out=composeOracleReading({
    territory:'amor',
    seed:'global-fallback-'+i,
    blocks:[...noMovement,...global]
  });
  const movement=out.blocks.find(b=>b.role==='movement');
  if(movement){
    if(movement.territory!=='global')throw new Error('expected global movement fallback');
    sawGlobalMovement=true;
    break;
  }
}
if(!sawGlobalMovement)throw new Error('did not exercise global movement fallback');

console.log('Oracle composer territory priority + global fallback: OK');
