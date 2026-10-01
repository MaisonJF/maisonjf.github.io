import { sha256Hex } from './core.js';

const QUESTION_STAGES=new Set(['open','recognize','deepen','touch','close','signature']);
const QUESTION_DIRECTIONS=new Set(['me_to_you','you_to_me','mutual','either']);
const QUESTION_TIMES=new Set(['past','present','future','timeless']);
const QUESTION_EXPOSURES=new Set(['paid','public_social','reward','internal_test']);
const QUESTION_TARGETS=new Set(['self','partner','both','prediction']);
const ORACLE_ROLES=new Set(['opening','recognition','tension','counterpoint','reframe','movement','close']);
const ORACLE_TONES=new Set(['gentle','direct','intimate','clear','confrontational']);
const ORACLE_RARITY=new Set(['common','uncommon','rare']);
const AUTHORITY_KEYS=new Set(['status','lifecycle_state','rotation_state','activate','active','approved','live','decision']);
const SENSITIVE_KEYS=new Set([
  'password','passwd','secret','token','api_key','apikey','authorization',
  'email','phone','telephone','address','full_address','private_conversation',
  'private_chat','answer_text','oracle_answer','paid_oracle','paid_content',
  'card_number','iban','nif','tax_id'
]);
const EMAIL_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE=/(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/;

function assertObject(value,name){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid_'+name);
  return value;
}
function assertSafe(value,path='candidate'){
  if(Array.isArray(value)){value.forEach((v,i)=>assertSafe(v,path+'['+i+']'));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,v] of Object.entries(value)){
    const lower=String(key).toLowerCase();
    if(SENSITIVE_KEYS.has(lower))throw new Error('forbidden_candidate_key:'+path+'.'+key);
    if(AUTHORITY_KEYS.has(lower))throw new Error('editorial_authority_forbidden:'+path+'.'+key);
    assertSafe(v,path+'.'+key);
  }
}
function text(value,name,min,max){
  const out=String(value??'').replace(/\s+/g,' ').trim();
  if(out.length<min||out.length>max)throw new Error('invalid_'+name);
  if(EMAIL_RE.test(out)||PHONE_RE.test(out))throw new Error('candidate_pii_detected');
  return out;
}
function optionalText(value,name,max){
  if(value==null||String(value).trim()==='')return null;
  return text(value,name,1,max);
}
function enumValue(value,name,allowed,fallback=null){
  const out=value==null||String(value).trim()===''?fallback:String(value).trim();
  if(out==null)return null;
  if(!allowed.has(out))throw new Error('invalid_'+name);
  return out;
}
function intRange(value,name,min,max,fallback){
  const n=value==null?fallback:Number(value);
  if(!Number.isInteger(n)||n<min||n>max)throw new Error('invalid_'+name);
  return n;
}
function strings(value,name,maxItems=12,maxChars=120){
  if(value==null)return [];
  if(!Array.isArray(value))throw new Error('invalid_'+name);
  return [...new Set(value.map(v=>String(v).trim()).filter(Boolean).map(v=>v.slice(0,maxChars)))].slice(0,maxItems);
}
function objectJson(value,name){
  if(value==null)return {};
  const obj=assertObject(value,name);
  assertSafe(obj,name);
  return obj;
}
function cleanKey(value,name,max=160){
  const out=String(value??'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9._:-]{1,159}$/.test(out)||out.length>max)throw new Error('invalid_'+name);
  return out;
}
function id(prefix,value){
  if(value==null||String(value).trim()==='')return prefix+crypto.randomUUID();
  const out=String(value).trim();
  if(!new RegExp('^'+prefix+'[A-Za-z0-9_-]{4,180}$').test(out))throw new Error('invalid_id');
  return out;
}
async function fingerprint(value){
  return (await sha256Hex(String(value).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim())).slice(0,40);
}
function sourceOcean(raw){
  return cleanKey(raw?.source_ocean_id,'source_ocean_id',160);
}
function baseResult(type,contentId,oceanKey,fp){
  return {
    ok:true,
    content_type:type,
    content_id:contentId,
    source_ocean_id:oceanKey,
    semantic_fingerprint:fp,
    status:'candidate',
    lifecycle_state:'candidate',
    rotation_state:'new',
    editorial_review_required:true,
    automatic_activation:false,
    github_body_persistence:false,
    storage:'D1'
  };
}
async function duplicate(db,table,idColumn,idValue,fp){
  return await db.prepare(
    'SELECT '+idColumn+' AS id FROM '+table+' WHERE '+idColumn+'=?1 OR semantic_fingerprint=?2 LIMIT 1'
  ).bind(idValue,fp).first();
}
async function questionCandidate(env,raw){
  const db=env.GROWTH_DB;
  const questionId=id('q_',raw.id);
  const oceanKey=sourceOcean(raw);
  const theme=text(raw.theme,'theme',2,120);
  const body=text(raw.text,'text',8,500);
  const fp=await fingerprint(body);
  const existing=await duplicate(db,'vault_questions','question_id',questionId,fp);
  if(existing)return {...baseResult('question',String(existing.id),oceanKey,fp),duplicate:true};

  const stage=enumValue(raw.stage,'stage',QUESTION_STAGES,'open');
  const direction=enumValue(raw.direction,'direction',QUESTION_DIRECTIONS,'either');
  const timeScope=enumValue(raw.time_scope??raw.time,'time_scope',QUESTION_TIMES,'timeless');
  const exposure=enumValue(raw.exposure,'exposure',QUESTION_EXPOSURES,'paid');
  const target=enumValue(raw.target,'target',QUESTION_TARGETS,'both');
  const intensity=intRange(raw.intensity,'intensity',1,4,2);
  const canonicalKey=optionalText(raw.canonical_key,'canonical_key',160)||questionId.slice(2);
  const subthemes=strings(raw.subthemes,'subthemes');
  const painFamily=optionalText(raw.pain_family,'pain_family',120)||theme;
  const subterritory=optionalText(raw.subterritory,'subterritory',120)||(subthemes[0]||theme);
  const similarityGroup=optionalText(raw.similarity_group,'similarity_group',120)||subterritory;
  const emotionalFunction=optionalText(raw.emotional_function,'emotional_function',120)||'discovery';
  const cognitiveLoad=intRange(raw.cognitive_load,'cognitive_load',1,5,2);
  const vulnerability=intRange(raw.vulnerability,'vulnerability',1,5,2);
  const conflictPotential=intRange(raw.conflict_potential,'conflict_potential',1,5,2);
  const playfulness=intRange(raw.playfulness,'playfulness',1,5,2);
  const scores=objectJson(raw.scores,'scores');
  const productFit=objectJson(raw.product_fit,'product_fit');
  const className=optionalText(raw.class,'class',80)||'mirror';
  const decisionId='dec_'+crypto.randomUUID();

  const insert=db.prepare(`
    INSERT INTO vault_questions
      (question_id,canonical_key,theme,text,subthemes_json,class,stage,intensity,direction,time_scope,
       exposure,status,scores_json,viral_json,conflicts_json,pairs_json,similarity_group,source_kind,
       pain_family,subterritory,target,emotional_function,cognitive_load,vulnerability,conflict_potential,
       playfulness,semantic_fingerprint,compatibility_json,product_fit_json,lifecycle_state,rotation_state,
       source_ocean_id,quality_version)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'candidate',?12,'{}','[]','[]',?13,
            'ocean_mcp_candidate',?14,?15,?16,?17,?18,?19,?20,?21,?22,'{}',?23,'candidate','new',?24,
            'ocean-mcp-candidate-v1')
  `).bind(
    questionId,canonicalKey,theme,body,JSON.stringify(subthemes),className,stage,intensity,direction,timeScope,
    exposure,JSON.stringify(scores),similarityGroup,painFamily,subterritory,target,emotionalFunction,
    cognitiveLoad,vulnerability,conflictPotential,playfulness,fp,JSON.stringify(productFit),oceanKey
  );
  const decision=db.prepare(`
    INSERT INTO vault_editorial_decisions
      (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
    VALUES (?1,'question',?2,'propose','ocean_mcp_candidate',?3,'ocean-mcp-candidate-v1')
  `).bind(decisionId,questionId,JSON.stringify({source_ocean_id:oceanKey,exposure}));
  await db.batch([insert,decision]);
  return {...baseResult('question',questionId,oceanKey,fp),duplicate:false,exposure};
}
async function oracleCandidate(env,raw){
  const db=env.GROWTH_DB;
  const blockId=id('ob_',raw.id);
  const oceanKey=sourceOcean(raw);
  const territory=text(raw.territory,'territory',2,120);
  const role=enumValue(raw.role,'role',ORACLE_ROLES);
  const body=text(raw.text,'text',12,4000);
  const fp=await fingerprint(body);
  const existing=await duplicate(db,'vault_oracle_blocks','block_id',blockId,fp);
  if(existing)return {...baseResult('oracle_block',String(existing.id),oceanKey,fp),duplicate:true};

  const intensity=intRange(raw.intensity,'intensity',1,4,2);
  const canonicalKey=optionalText(raw.canonical_key,'canonical_key',160)||blockId.slice(3);
  const title=optionalText(raw.title,'title',180);
  const painFamily=optionalText(raw.pain_family,'pain_family',120)||territory;
  const subterritory=optionalText(raw.subterritory,'subterritory',120)||territory;
  const tone=enumValue(raw.tone,'tone',ORACLE_TONES,'intimate');
  const emotionalFunction=optionalText(raw.emotional_function,'emotional_function',120)||'recognition';
  const rarity=enumValue(raw.rarity,'rarity',ORACLE_RARITY,'common');
  const tags=strings(raw.tags,'tags',20,80);
  const compatibility=objectJson(raw.compatibility,'compatibility');
  const scores=objectJson(raw.scores,'scores');
  const productFit=objectJson(raw.product_fit,'product_fit');
  const decisionId='dec_'+crypto.randomUUID();

  const insert=db.prepare(`
    INSERT INTO vault_oracle_blocks
      (block_id,canonical_key,territory,role,intensity,text,status,compatibility_json,scores_json,source_kind,
       title,pain_family,subterritory,tone,emotional_function,semantic_fingerprint,tags_json,product_fit_json,
       lifecycle_state,rotation_state,rarity,source_ocean_id,quality_version)
    VALUES (?1,?2,?3,?4,?5,?6,'candidate',?7,?8,'ocean_mcp_candidate',?9,?10,?11,?12,?13,?14,?15,?16,
            'candidate','new',?17,?18,'ocean-mcp-candidate-v1')
  `).bind(
    blockId,canonicalKey,territory,role,intensity,body,JSON.stringify(compatibility),JSON.stringify(scores),
    title,painFamily,subterritory,tone,emotionalFunction,fp,JSON.stringify(tags),JSON.stringify(productFit),
    rarity,oceanKey
  );
  const decision=db.prepare(`
    INSERT INTO vault_editorial_decisions
      (decision_id,content_type,content_id,decision,reason_code,details_json,engine_version)
    VALUES (?1,'oracle_block',?2,'propose','ocean_mcp_candidate',?3,'ocean-mcp-candidate-v1')
  `).bind(decisionId,blockId,JSON.stringify({source_ocean_id:oceanKey,territory,role}));
  await db.batch([insert,decision]);
  return {...baseResult('oracle_block',blockId,oceanKey,fp),duplicate:false,territory,role};
}

export async function ingestVaultCandidate(env,raw){
  if(!env?.GROWTH_DB)throw new Error('growth_db_missing');
  assertObject(raw,'candidate');
  assertSafe(raw);
  const type=String(raw.content_type||'').trim();
  if(type==='question')return await questionCandidate(env,raw);
  if(type==='oracle_block')return await oracleCandidate(env,raw);
  throw new Error('invalid_content_type');
}
