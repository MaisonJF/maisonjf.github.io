/*
MAISON JF® — shared internal content ontology
Public surfaces must never expose these scoring fields.
Paid question/reading bodies must not be stored here.
*/

export const MAISON_CONTENT_ONTOLOGY={
  version:'2026-09-18-v1',
  types:['question','oracle_block'],
  question:{
    stages:['open','recognize','deepen','touch','close','signature'],
    classes:[
      'mirror','revelation','memory','contrast','boundary','desire','choice',
      'future','absence','recognition','friction','repair','intimacy','signature'
    ],
    intensities:[1,2,3,4],
    exposures:['public_social','paid','reward','internal_test'],
    statuses:['candidate','review','approved','active','retired'],
    directions:['me_to_you','you_to_me','mutual','either'],
    times:['past','present','future','timeless']
  },
  oracle:{
    roles:['opening','recognition','tension','counterpoint','reframe','movement','close'],
    intensities:[1,2,3,4],
    statuses:['candidate','review','approved','active','retired']
  },
  qualityDimensions:[
    'kiss','hormozi','barnum','feral','viral','conversationValue',
    'clarity','originality','safety','editorialQuality'
  ],
  eventDimensions:[
    'shown','advanced','passed','shared','completed','repurchased'
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
  if(card.scores){
    for(const [key,value] of Object.entries(card.scores)){
      if(!SCORE_KEYS.has(key))errors.push('unknown_score:'+key);
      if(typeof value!=='number'||value<0||value>5)errors.push('invalid_score:'+key);
    }
  }
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
  return {ok:errors.length===0,errors};
}
