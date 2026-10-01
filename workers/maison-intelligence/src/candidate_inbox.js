import { sha256Hex, uniqueCanonicalUrls } from './core.js';

export const CANDIDATE_TYPES=new Set([
  'question','oracle_block','test','farol_path',
  'reel','post','story','carousel','video_script',
  'physical_product','digital_product','bundle','service','experience',
  'ebook','campaign','b2b','seasonal_offer','experiment'
]);

const AUTHORITY_KEYS=new Set([
  'status','lifecycle_state','rotation_state','activate','active','approved','live',
  'decision','launch_authorized','price_authorized','public_side_effects'
]);
const SENSITIVE_KEYS=new Set([
  'password','passwd','secret','token','api_key','apikey','authorization',
  'email','phone','telephone','address','full_address','private_conversation',
  'private_chat','answer_text','oracle_answer','paid_oracle','paid_content',
  'card_number','iban','nif','tax_id','stripe_customer_id','customer_id'
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
    if(AUTHORITY_KEYS.has(lower))throw new Error('candidate_authority_forbidden:'+path+'.'+key);
    assertSafe(v,path+'.'+key);
  }
}
function cleanText(value,name,min,max){
  const out=String(value??'').replace(/\s+/g,' ').trim();
  if(out.length<min||out.length>max)throw new Error('invalid_'+name);
  if(EMAIL_RE.test(out)||PHONE_RE.test(out))throw new Error('candidate_pii_detected');
  return out;
}
function optionalText(value,name,max){
  if(value==null||String(value).trim()==='')return null;
  return cleanText(value,name,1,max);
}
function score(value,fallback=50){
  const n=value==null?fallback:Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.max(0,Math.min(100,Math.round(n)));
}
function strings(value,maxItems=20,maxChars=240){
  if(value==null)return [];
  if(!Array.isArray(value))throw new Error('invalid_array');
  return [...new Set(value.map(v=>String(v).replace(/\s+/g,' ').trim()).filter(Boolean).map(v=>v.slice(0,maxChars)))].slice(0,maxItems);
}
function safePayload(value){
  if(value==null)return {};
  const obj=assertObject(value,'payload');
  assertSafe(obj,'payload');
  return obj;
}
function idFromFingerprint(fp){ return 'mci_'+fp.slice(0,36); }

export async function ingestCandidateInbox(env,raw){
  if(!env?.GROWTH_DB)throw new Error('growth_db_missing');
  assertObject(raw,'candidate');
  assertSafe(raw);

  const type=String(raw.candidate_type||raw.content_type||'').trim();
  if(!CANDIDATE_TYPES.has(type))throw new Error('invalid_candidate_type');

  const sourceOceanId=cleanText(raw.source_ocean_id,'source_ocean_id',2,160);
  const providerId=cleanText(raw.provider_id||'manual','provider_id',1,120);
  const modelId=optionalText(raw.model_id,'model_id',240);
  const territory=cleanText(raw.territory||'maison','territory',1,120);
  const title=cleanText(raw.title||raw.text||type,'title',1,240);
  const body=cleanText(raw.body||raw.text||raw.summary,'body',1,5000);
  const rationale=cleanText(raw.rationale||'Candidate generated for human review.','rationale',1,2000);
  const relatedAssets=strings(raw.related_assets,20,240);
  const evidenceRefs=uniqueCanonicalUrls(strings(raw.evidence_refs,30,2048));
  const payload=safePayload(raw.payload);

  const fp=await sha256Hex(JSON.stringify({
    type,
    title:title.toLowerCase(),
    body:body.toLowerCase(),
    territory:territory.toLowerCase()
  }));
  const candidateId=idFromFingerprint(fp);
  const existing=await env.GROWTH_DB.prepare(
    'SELECT candidate_id FROM maison_candidate_inbox WHERE candidate_type=?1 AND semantic_fingerprint=?2 LIMIT 1'
  ).bind(type,fp).first();
  if(existing){
    return {
      ok:true,candidate_id:String(existing.candidate_id),candidate_type:type,duplicate:true,
      status:'candidate',lifecycle_state:'candidate',rotation_state:'new',
      editorial_review_required:true,automatic_activation:false,public_side_effects:false,storage:'D1'
    };
  }

  await env.GROWTH_DB.prepare(`
    INSERT INTO maison_candidate_inbox
      (candidate_id,candidate_type,source_ocean_id,source_observation_id,provider_id,model_id,
       territory,title,body,rationale,payload_json,evidence_refs_json,related_assets_json,
       novelty_score,maison_fit_score,feasibility_score,demand_score,commercial_score,
       reuse_existing_score,semantic_fingerprint)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)
  `).bind(
    candidateId,type,sourceOceanId,optionalText(raw.source_observation_id,'source_observation_id',160),
    providerId,modelId,territory,title,body,rationale,
    JSON.stringify(payload),JSON.stringify(evidenceRefs),JSON.stringify(relatedAssets),
    score(raw.novelty_score),score(raw.maison_fit_score),score(raw.feasibility_score),
    score(raw.demand_score),score(raw.commercial_score),score(raw.reuse_existing_score),
    fp
  ).run();

  return {
    ok:true,candidate_id:candidateId,candidate_type:type,duplicate:false,
    status:'candidate',lifecycle_state:'candidate',rotation_state:'new',
    editorial_review_required:true,automatic_activation:false,public_side_effects:false,storage:'D1'
  };
}

export async function listCandidateInbox(env,{limit=50,type=null,decision='pending'}={}){
  if(!env?.GROWTH_DB)throw new Error('growth_db_missing');
  const safeLimit=Math.max(1,Math.min(100,Number.parseInt(limit,10)||50));
  const filters=[];
  const params=[];
  if(type){
    if(!CANDIDATE_TYPES.has(type))throw new Error('invalid_candidate_type');
    params.push(type); filters.push('candidate_type=?'+params.length);
  }
  if(decision==='pending')filters.push('latest_decision IS NULL');
  else if(decision&&decision!=='all'){
    params.push(decision); filters.push('latest_decision=?'+params.length);
  }
  const where=filters.length?'WHERE '+filters.join(' AND '):'';
  const statement=env.GROWTH_DB.prepare(`
    SELECT candidate_id,candidate_type,source_ocean_id,provider_id,model_id,territory,title,body,rationale,
           payload_json,evidence_refs_json,related_assets_json,
           novelty_score,maison_fit_score,feasibility_score,demand_score,commercial_score,reuse_existing_score,
           created_at,latest_decision,latest_decision_at
      FROM maison_candidate_review_queue
      ${where}
     ORDER BY created_at DESC
     LIMIT ${safeLimit}
  `);
  const bound=params.length?statement.bind(...params):statement;
  const rows=await bound.all();
  return (rows?.results||[]).map(row=>({
    ...row,
    payload:JSON.parse(row.payload_json||'{}'),
    evidence_refs:JSON.parse(row.evidence_refs_json||'[]'),
    related_assets:JSON.parse(row.related_assets_json||'[]'),
    payload_json:undefined,evidence_refs_json:undefined,related_assets_json:undefined
  }));
}
