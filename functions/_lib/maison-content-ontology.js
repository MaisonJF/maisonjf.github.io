/*
MAISON JF® — shared internal content ontology
Public surfaces must never expose these scoring fields.
Paid question/reading bodies must not be stored here.
*/

export const MAISON_CONTENT_ONTOLOGY={
  version:'2026-09-19-v2',
  types:['question','oracle_block','taxonomy','content_need'],
  lifecycleStates:['candidate','lab','vault','live','review','retired'],
  rotationStates:['new','limited','normal','review','retired'],
  question:{
    stages:['open','recognize','deepen','touch','close','signature'],
    classes:[
      'mirror','revelation','memory','contrast','boundary','desire','choice',
      'future','absence','recognition','friction','repair','intimacy','signature'
    ],
    functions:[
      'discovery','recognition','memory','contrast','vulnerability','desire',
      'tension','revelation','choice','repair','integration','closing'
    ],
    targets:['self','partner','both','prediction'],
    intensities:[1,2,3,4],
    exposures:['public_social','paid','reward','internal_test'],
    statuses:['candidate','review','approved','active','retired'],
    directions:['me_to_you','you_to_me','mutual','either'],
    times:['past','present','future','timeless']
  },
  oracle:{
    roles:['opening','recognition','tension','counterpoint','reframe','movement','close'],
    functions:['recognise','validate','expose','challenge','reframe','soothe','activate','close'],
    tones:['gentle','direct','intimate','clear','confrontational'],
    rarities:['common','uncommon','rare'],
    intensities:[1,2,3,4],
    statuses:['candidate','review','approved','active','retired']
  },
  qualityDimensions:[
    'kiss','hormozi','barnum','feral','viral','conversationValue',
    'clarity','originality','safety','editorialQuality',
    'humanity','specificity','emotionalTruth','composability'
  ],
  eventDimensions:[
    'shown','advanced','passed','shared','completed','repurchased','reopened','qualityFailed'
  ]
};

const SCORE_KEYS=new Set(MAISON_CONTENT_ONTOLOGY.qualityDimensions);

export function validateQuestionCard(card){
  const errors=[];
  if(!card||typeof card!=='object')return {ok:false,errors:['card_object_required']};
  if(!/^q_[a-z0-9_-]+$/i.test(String(card.id||'')))errors.push('invalid_id');
  if(!card.theme)errors.push('theme_required');
  if(!card.text||typeof card.text!=='string')errors.push('text_required');
  if(!MAISON_CONTENT_ONTOLOGY.question.stages.includes(card.stage))errors.push('invalid_stage');
  if(!MAISON_CONTENT_ONTOLOGY.question.classes.includes(card.class))errors.push('invalid_class');
  if(!MAISON_CONTENT_ONTOLOGY.question.intensities.includes(card.intensity))errors.push('invalid_intensity');
  if(!MAISON_CONTENT_ONTOLOGY.question.exposures.includes(card.exposure))errors.push('invalid_exposure');
  if(!MAISON_CONTENT_ONTOLOGY.question.statuses.includes(card.status))errors.push('invalid_status');
  if(card.direction&&!MAISON_CONTENT_ONTOLOGY.question.directions.includes(card.direction))errors.push('invalid_direction');
  if(card.time&&!MAISON_CONTENT_ONTOLOGY.question.times.includes(card.time))errors.push('invalid_time');
  if(card.target&&!MAISON_CONTENT_ONTOLOGY.question.targets.includes(card.target))errors.push('invalid_target');
  if(card.emotionalFunction&&!MAISON_CONTENT_ONTOLOGY.question.functions.includes(card.emotionalFunction))errors.push('invalid_emotional_function');
  if(card.lifecycleState&&!MAISON_CONTENT_ONTOLOGY.lifecycleStates.includes(card.lifecycleState))errors.push('invalid_lifecycle_state');
  if(card.rotationState&&!MAISON_CONTENT_ONTOLOGY.rotationStates.includes(card.rotationState))errors.push('invalid_rotation_state');
  for(const key of ['cognitiveLoad','vulnerability','conflictPotential','playfulness']){
    if(card[key]!=null&&(!Number.isInteger(card[key])||card[key]<1||card[key]>5))errors.push('invalid_'+key);
  }
  validateScores(card.scores,errors);
  if(card.metrics&&Object.values(card.metrics).some(v=>typeof v!=='number'||v<0))errors.push('invalid_metrics');
  return {ok:errors.length===0,errors};
}

export function validateOracleBlock(block){
  const errors=[];
  if(!block||typeof block!=='object')return {ok:false,errors:['block_object_required']};
  if(!/^ob_[a-z0-9_-]+$/i.test(String(block.id||'')))errors.push('invalid_id');
  if(!block.territory)errors.push('territory_required');
  if(!block.text||typeof block.text!=='string')errors.push('text_required');
  if(!MAISON_CONTENT_ONTOLOGY.oracle.roles.includes(block.role))errors.push('invalid_role');
  if(!MAISON_CONTENT_ONTOLOGY.oracle.intensities.includes(block.intensity))errors.push('invalid_intensity');
  if(!MAISON_CONTENT_ONTOLOGY.oracle.statuses.includes(block.status))errors.push('invalid_status');
  if(block.tone&&!MAISON_CONTENT_ONTOLOGY.oracle.tones.includes(block.tone))errors.push('invalid_tone');
  if(block.emotionalFunction&&!MAISON_CONTENT_ONTOLOGY.oracle.functions.includes(block.emotionalFunction))errors.push('invalid_emotional_function');
  if(block.rarity&&!MAISON_CONTENT_ONTOLOGY.oracle.rarities.includes(block.rarity))errors.push('invalid_rarity');
  if(block.lifecycleState&&!MAISON_CONTENT_ONTOLOGY.lifecycleStates.includes(block.lifecycleState))errors.push('invalid_lifecycle_state');
  if(block.rotationState&&!MAISON_CONTENT_ONTOLOGY.rotationStates.includes(block.rotationState))errors.push('invalid_rotation_state');
  validateScores(block.scores,errors);
  return {ok:errors.length===0,errors};
}

function validateScores(scores,errors){
  if(!scores)return;
  for(const [key,value] of Object.entries(scores)){
    if(!SCORE_KEYS.has(key))errors.push('unknown_score:'+key);
    if(typeof value!=='number'||value<0||value>5)errors.push('invalid_score:'+key);
  }
}
