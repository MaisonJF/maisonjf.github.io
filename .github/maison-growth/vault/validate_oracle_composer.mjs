import { composeOracleReading } from '../../../functions/_lib/oracle-composer.js';

const roles=['opening','recognition','tension','counterpoint','reframe','movement','close'];

const TEST_TEXT={
  opening:'Abre a situação pelo presente concreto e deixa a conclusão em suspenso.',
  recognition:'Reconhece o padrão observado sem transformar sinais pequenos em certezas.',
  tension:'Mostra a fricção principal e distingue desejo, medo e comportamento.',
  counterpoint:'Introduz uma leitura alternativa que reduz conclusões automáticas.',
  reframe:'Reorganiza a pergunta para devolver clareza e margem de escolha.',
  movement:'Propõe um próximo passo observável, pequeno e proporcional ao contexto.',
  close:'Fecha com uma pergunta simples que devolve a decisão à pessoa.'
};

function block({id,territory,role,intensity=2}){
  return {
    id,
    canonicalKey:id,
    territory,
    role,
    intensity,
    text:TEST_TEXT[role],
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
  if(out.blocks.length!==1)throw new Error('expected a single Oracle message');
  if(out.blocks.some(b=>b.territory!=='amor')){
    throw new Error('global block selected despite complete territory-specific coverage');
  }
}

const brazilianPortuguese=composeOracleReading({
  territory:'amor',
  seed:'pt-br-title-fallback',
  locale:'pt-BR',
  blocks:specific.map(b=>({...b,title:undefined}))
});
if(brazilianPortuguese.title!=='Uma leitura'){
  throw new Error('PT-BR Oracle title must use a Brazilian Portuguese fallback');
}

const fallback=composeOracleReading({
  territory:'amor',
  seed:'global-fallback',
  blocks:[...specific.map(b=>({...b,status:'retired'})),...global]
});
if(fallback.blocks.length!==1||fallback.blocks[0].territory!=='global'){
  throw new Error('expected one global message when no territory-specific message is eligible');
}

console.log('Oracle single message, territory priority, global fallback and PT-BR title: OK');
