import A2_SOURCE_REGISTRY from './a2_source_registry.generated.js';

const EVENT_TYPE_RE=/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const HEX64_RE=/^[0-9a-f]{64}$/;
const TOKEN_RE=/^[A-Za-z0-9._:/@+-]{1,200}$/;
const HOST_RE=/^(?=.{1,255}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const COUNTRY_RE=/^[A-Z]{2}$/;
const EMAIL_RE=/(?:^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:$|[^A-Za-z0-9._%+-])/;
const IBAN_RE=/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;

const FORBIDDEN_KEYS=new Set([
  'email','e_mail','customer_email','billing_email',
  'phone','phone_number','telephone','mobile',
  'name','full_name','first_name','last_name','customer_name',
  'address','street_address','postal_address','shipping_address',
  'postal_code','zip','zip_code',
  'nif','vat_number','tax_id','iban','bic','swift',
  'card_number','cardholder_name','billing_details','shipping_details',
  'stripe_customer_id','customer_id',
  'oracle_response','oracle_answer','oracle_content',
  'reading_text','paid_oracle_text','response_text','answer_text',
  'raw_query','query_text','free_text','message','notes'
]);
const FORBIDDEN_FRAGMENTS=[
  'oracle_response','oracle_answer','paid_oracle','reading_text',
  'billing_details','shipping_details'
];
const ID_PREFIXES={
  journey_id:'jrn_',asset_id:'ast_',need_id:'ned_',solution_id:'sol_',
  rule_version_id:'rul_',model_version_id:'mdl_'
};
const TOP_FIELDS=new Set([
  'contract_version','source','event_type','occurred_at','idempotency_key',
  'journey_id','asset_id','need_id','solution_id','value_minor','currency',
  'privacy_class','metadata','rule_version_id','model_version_id'
]);

export class A2RuntimeError extends Error {
  constructor(code,status=400){
    super(code);
    this.code=code;
    this.status=status;
  }
}

function enabled(value){
  return String(value??'').toLowerCase()==='true';
}

function tokenFrom(request){
  const raw=request.headers.get('Authorization')||'';
  return raw.startsWith('Bearer ')?raw.slice(7).trim():'';
}

function constantTimeEqual(left,right){
  const a=String(left??'');
  const b=String(right??'');
  let diff=a.length^b.length;
  const n=Math.max(a.length,b.length);
  for(let i=0;i<n;i++){
    diff|=(a.charCodeAt(i%Math.max(a.length,1))||0)^(b.charCodeAt(i%Math.max(b.length,1))||0);
  }
  return diff===0;
}

function response(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'Pragma':'no-cache',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer'
    }
  });
}

function containsDirectPii(value){
  const text=String(value??'');
  if(EMAIL_RE.test(text)||IBAN_RE.test(text))return true;
  const digits=text.replace(/\D/g,'');
  return digits.length>=13&&digits.length<=19&&/(?:\d[ -]?){13,19}/.test(text);
}

function privacyScan(value,path='$'){
  if(Array.isArray(value)){
    value.forEach((child,i)=>privacyScan(child,`${path}[${i}]`));
    return;
  }
  if(value&&typeof value==='object'){
    for(const [key,child] of Object.entries(value)){
      const k=String(key).trim().toLowerCase();
      if(FORBIDDEN_KEYS.has(k)||FORBIDDEN_FRAGMENTS.some(fragment=>k.includes(fragment))){
        throw new A2RuntimeError('privacy_violation');
      }
      privacyScan(child,`${path}.${key}`);
    }
    return;
  }
  if(typeof value==='string'&&containsDirectPii(value)){
    throw new A2RuntimeError('privacy_violation');
  }
}

function normalizeTimestamp(value){
  if(typeof value!=='string'||!value.trim())throw new A2RuntimeError('invalid_occurred_at');
  const raw=value.trim();
  if(!/(?:Z|[+-]\d{2}:\d{2})$/i.test(raw))throw new A2RuntimeError('invalid_occurred_at');
  const ms=Date.parse(raw);
  if(!Number.isFinite(ms))throw new A2RuntimeError('invalid_occurred_at');
  return new Date(ms).toISOString();
}

function normalizeId(value,prefix){
  if(value==null)return null;
  if(typeof value!=='string'||value.length!==40||!value.startsWith(prefix)){
    throw new A2RuntimeError('invalid_identifier');
  }
  const uuid=value.slice(prefix.length);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)){
    throw new A2RuntimeError('invalid_identifier');
  }
  return value.toLowerCase();
}

function normalizeMetadataValue(value,spec){
  const kind=spec?.type;
  if(kind==='boolean'){
    if(typeof value!=='boolean')throw new A2RuntimeError('invalid_metadata');
    return value;
  }
  if(kind==='integer'){
    if(!Number.isInteger(value))throw new A2RuntimeError('invalid_metadata');
    if(spec.minimum!=null&&value<Number(spec.minimum))throw new A2RuntimeError('invalid_metadata');
    return value;
  }
  if(kind==='sha256'){
    const v=typeof value==='string'?value.trim().toLowerCase():'';
    if(!HEX64_RE.test(v))throw new A2RuntimeError('invalid_metadata');
    return v;
  }
  if(kind==='country_code'){
    const v=typeof value==='string'?value.trim().toUpperCase():'';
    if(!COUNTRY_RE.test(v))throw new A2RuntimeError('invalid_metadata');
    return v;
  }
  if(kind==='hostname'){
    const v=typeof value==='string'?value.trim().toLowerCase().replace(/\.$/,''):'';
    if(!HOST_RE.test(v))throw new A2RuntimeError('invalid_metadata');
    return v;
  }
  if(kind==='public_path'){
    if(typeof value!=='string')throw new A2RuntimeError('invalid_metadata');
    const v=value.trim().split(/[?#]/,1)[0];
    if(!v.startsWith('/')||v.includes('://')||v.length>Number(spec.maxLength??500)){
      throw new A2RuntimeError('invalid_metadata');
    }
    return v;
  }
  if(kind==='token'){
    if(typeof value!=='string')throw new A2RuntimeError('invalid_metadata');
    const v=value.trim();
    const max=Number(spec.maxLength??200);
    if(v.length<1||v.length>max||!TOKEN_RE.test(v)||containsDirectPii(v)){
      throw new A2RuntimeError('invalid_metadata');
    }
    return v;
  }
  throw new A2RuntimeError('invalid_registry_type',500);
}

export function normalizeA2Event(raw,registry=A2_SOURCE_REGISTRY){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new A2RuntimeError('invalid_event');
  const unknownTop=Object.keys(raw).filter(k=>!TOP_FIELDS.has(k));
  if(unknownTop.length)throw new A2RuntimeError('unknown_top_level_field');
  if(raw.contract_version!==1)throw new A2RuntimeError('unsupported_contract_version');

  const source=typeof raw.source==='string'?raw.source.trim().toLowerCase():'';
  if(!source||source.length>80)throw new A2RuntimeError('invalid_source');
  if(registry?.default!=='deny')throw new A2RuntimeError('invalid_source_registry',500);
  const sourceSpec=registry?.sources?.[source];
  if(!sourceSpec)throw new A2RuntimeError('unknown_source');

  const eventType=typeof raw.event_type==='string'?raw.event_type.trim().toLowerCase():'';
  if(!EVENT_TYPE_RE.test(eventType))throw new A2RuntimeError('invalid_event_type');
  const prefixes=sourceSpec.allowed_event_prefixes||[];
  if(!prefixes.some(prefix=>eventType.startsWith(prefix)))throw new A2RuntimeError('event_type_not_allowed');

  const key=typeof raw.idempotency_key==='string'?raw.idempotency_key.trim():'';
  if(key.length<8||key.length>200||containsDirectPii(key))throw new A2RuntimeError('invalid_idempotency_key');

  const privacyClass=raw.privacy_class??'pseudonymous';
  if(!['anonymous','pseudonymous','aggregated','system'].includes(privacyClass)){
    throw new A2RuntimeError('invalid_privacy_class');
  }
  if(!(sourceSpec.privacy_class||[]).includes(privacyClass)){
    throw new A2RuntimeError('privacy_class_not_allowed');
  }

  const metadataRaw=raw.metadata??{};
  if(!metadataRaw||typeof metadataRaw!=='object'||Array.isArray(metadataRaw)){
    throw new A2RuntimeError('invalid_metadata');
  }
  privacyScan(metadataRaw);

  const eventPolicies=sourceSpec.events;
  if(eventPolicies&&typeof eventPolicies==='object'){
    const policy=eventPolicies[eventType];
    if(!policy)throw new A2RuntimeError('event_type_not_specifically_allowlisted');
    const eventAllowed=new Set(policy.allowed_metadata||[]);
    if(Object.keys(metadataRaw).some(k=>!eventAllowed.has(k))){
      throw new A2RuntimeError('metadata_not_allowed_for_event');
    }
    for(const required of policy.required_metadata||[]){
      if(metadataRaw[required]==null||metadataRaw[required]===''){
        throw new A2RuntimeError('required_metadata_missing');
      }
    }
  }

  const allowed=sourceSpec.metadata||{};
  if(Object.keys(metadataRaw).some(k=>!(k in allowed))){
    throw new A2RuntimeError('metadata_not_allowlisted');
  }
  const metadata={};
  for(const keyName of Object.keys(metadataRaw).sort()){
    metadata[keyName]=normalizeMetadataValue(metadataRaw[keyName],allowed[keyName]);
  }
  privacyScan(metadata);

  const ids={};
  for(const [field,prefix] of Object.entries(ID_PREFIXES)){
    ids[field]=normalizeId(raw[field],prefix);
  }

  let valueMinor=raw.value_minor??null;
  let currency=raw.currency??null;
  if(valueMinor==null){
    if(currency!=null)throw new A2RuntimeError('currency_without_value');
    currency=null;
  }else{
    if(!Number.isInteger(valueMinor))throw new A2RuntimeError('invalid_value_minor');
    if(typeof currency!=='string'||!/^[A-Za-z]{3}$/.test(currency.trim())){
      throw new A2RuntimeError('invalid_currency');
    }
    currency=currency.trim().toUpperCase();
  }

  const normalized={
    contract_version:1,
    source,
    event_type:eventType,
    occurred_at:normalizeTimestamp(raw.occurred_at),
    idempotency_key:key,
    schema_version:2,
    privacy_class:privacyClass,
    metadata,
    journey_id:ids.journey_id,
    asset_id:ids.asset_id,
    need_id:ids.need_id,
    solution_id:ids.solution_id,
    value_minor:valueMinor,
    currency,
    rule_version_id:ids.rule_version_id,
    model_version_id:ids.model_version_id
  };
  privacyScan(normalized);
  return normalized;
}

function stableJson(value){
  if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
  }
  return JSON.stringify(value);
}

async function sha256(text){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function uuid7(){
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  let ms=BigInt(Date.now());
  for(let i=5;i>=0;i--){
    bytes[i]=Number(ms&255n);
    ms>>=8n;
  }
  bytes[6]=(bytes[6]&0x0f)|0x70;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

async function toA1Event(normalized){
  const canonical={...normalized};
  delete canonical.contract_version;
  const payloadHash=await sha256(stableJson(canonical));
  return {
    event_id:'evt_'+uuid7(),
    idempotency_key:normalized.idempotency_key,
    event_type:normalized.event_type,
    source:normalized.source,
    schema_version:2,
    occurred_at:normalized.occurred_at,
    journey_id:normalized.journey_id,
    asset_id:normalized.asset_id,
    need_id:normalized.need_id,
    solution_id:normalized.solution_id,
    value_minor:normalized.value_minor,
    currency:normalized.currency,
    privacy_class:normalized.privacy_class,
    payload_hash:payloadHash,
    metadata_json:stableJson(normalized.metadata||{}),
    rule_version_id:normalized.rule_version_id,
    model_version_id:normalized.model_version_id
  };
}

async function findExisting(db,source,key){
  return await db.prepare(
    'SELECT event_id,payload_hash FROM events WHERE source=?1 AND idempotency_key=?2 LIMIT 1'
  ).bind(source,key).first();
}

export async function persistA2Event(db,normalized){
  if(!db||typeof db.prepare!=='function')throw new A2RuntimeError('a2_database_unavailable',503);
  const event=await toA1Event(normalized);
  const existing=await findExisting(db,event.source,event.idempotency_key);
  if(existing){
    if(existing.payload_hash!==event.payload_hash)throw new A2RuntimeError('idempotency_conflict',409);
    return {status:'duplicate',event_id:existing.event_id,payload_hash:existing.payload_hash,duplicate:true};
  }

  const scope='events:'+event.source;
  const reg=await db.prepare(
    'SELECT object_id,payload_hash FROM idempotency_registry WHERE scope=?1 AND idempotency_key=?2 LIMIT 1'
  ).bind(scope,event.idempotency_key).first();
  if(reg){
    if(reg.payload_hash!==event.payload_hash)throw new A2RuntimeError('idempotency_conflict',409);
    const existingById=await db.prepare(
      'SELECT event_id,payload_hash FROM events WHERE event_id=?1 LIMIT 1'
    ).bind(reg.object_id).first();
    if(existingById){
      return {status:'duplicate',event_id:existingById.event_id,payload_hash:existingById.payload_hash,duplicate:true};
    }
    throw new A2RuntimeError('idempotency_registry_inconsistent',503);
  }

  const eventStmt=db.prepare(`
    INSERT INTO events
      (event_id,idempotency_key,event_type,source,schema_version,occurred_at,
       journey_id,asset_id,need_id,solution_id,value_minor,currency,privacy_class,
       payload_hash,metadata_json,rule_version_id,model_version_id)
    VALUES
      (?1,?2,?3,?4,2,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)
  `).bind(
    event.event_id,event.idempotency_key,event.event_type,event.source,event.occurred_at,
    event.journey_id,event.asset_id,event.need_id,event.solution_id,event.value_minor,
    event.currency,event.privacy_class,event.payload_hash,event.metadata_json,
    event.rule_version_id,event.model_version_id
  );
  const registryStmt=db.prepare(`
    INSERT INTO idempotency_registry
      (scope,idempotency_key,object_type,object_id,payload_hash)
    VALUES (?1,?2,'event',?3,?4)
  `).bind(scope,event.idempotency_key,event.event_id,event.payload_hash);

  try{
    await db.batch([eventStmt,registryStmt]);
  }catch(error){
    const raced=await findExisting(db,event.source,event.idempotency_key);
    if(raced){
      if(raced.payload_hash!==event.payload_hash)throw new A2RuntimeError('idempotency_conflict',409);
      return {status:'duplicate',event_id:raced.event_id,payload_hash:raced.payload_hash,duplicate:true};
    }
    throw new A2RuntimeError('a2_storage_error',503);
  }
  return {status:'accepted',event_id:event.event_id,payload_hash:event.payload_hash,duplicate:false};
}

export async function handleA2IngestRequest(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/internal/a2/ingest')return null;
  if(!enabled(env.A2_INGEST_API_ENABLED))return response({error:'not_found'},404);
  if(!env.A2_INGEST_TOKEN)return response({error:'a2_ingest_misconfigured'},503);
  if(!constantTimeEqual(tokenFrom(request),env.A2_INGEST_TOKEN))return response({error:'unauthorized'},401);
  if(request.method!=='POST')return response({error:'method_not_allowed'},405);
  const type=request.headers.get('Content-Type')||'';
  if(!type.toLowerCase().includes('application/json'))return response({error:'json_required'},415);

  try{
    const rawText=await request.text();
    if(new TextEncoder().encode(rawText).length>32768)throw new A2RuntimeError('payload_too_large',413);
    let raw;
    try{raw=JSON.parse(rawText);}catch{throw new A2RuntimeError('invalid_json');}
    const normalized=normalizeA2Event(raw);
    const result=await persistA2Event(env.GROWTH_DB,normalized);
    return response(result,200);
  }catch(error){
    if(error instanceof A2RuntimeError)return response({error:error.code},error.status);
    console.error('A2 runtime error',String(error?.message||'internal_error'));
    return response({error:'internal_error'},500);
  }
}
