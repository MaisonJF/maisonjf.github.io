import { A2_COMMERCE_B2B_EVENTS } from './a2-commerce-contract.generated.js';

// Central first-party commerce telemetry adapter.
// Reuses A1 events/idempotency_registry and the canonical A3 B2B solution.
// It intentionally stores no customer identity, free text or B2B CRM state.

const TOKEN_RE=/^[A-Za-z0-9._:/@+\-]{1,200}$/;
const EMAIL_RE=/(?:^|[^A-Z0-9._%+\-])[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}(?:$|[^A-Z0-9._%+\-])/i;
export async function recordB2bLifecycleEvent(db,input={}){
  if(!db||typeof db.prepare!=='function')return {status:'ignored',reason:'growth_db_unavailable'};
  const eventType=String(input.event_type||'').trim().toLowerCase();
  const eventSpec=A2_COMMERCE_B2B_EVENTS[eventType];
  const allowed=eventSpec?.allowed_metadata;
  if(!Array.isArray(allowed))throw new Error('unsupported_b2b_event');

  const idempotencyKey=String(input.idempotency_key||'').trim();
  if(idempotencyKey.length<8||idempotencyKey.length>200||EMAIL_RE.test(idempotencyKey))throw new Error('invalid_idempotency_key');
  const journeyId=normalizeJourneyId(input.journey_id);
  const metadata=normalizeMetadata(input.metadata,allowed);
  const occurredAt=normalizeTime(input.occurred_at);
  const valueMinor=input.value_minor==null?null:Number(input.value_minor);
  const currency=input.currency==null?null:String(input.currency).trim().toUpperCase();
  if((valueMinor==null)!=(currency==null))throw new Error('value_currency_pair_required');
  if(valueMinor!=null&&(!Number.isInteger(valueMinor)||valueMinor<0))throw new Error('invalid_value_minor');
  if(currency!=null&&!/^[A-Z]{3}$/.test(currency))throw new Error('invalid_currency');

  const solution=await db.prepare(
    "SELECT solution_id FROM solutions WHERE solution_key='b2b' AND solution_type='b2b' AND status='active' LIMIT 1"
  ).first();
  if(!solution?.solution_id)return {status:'ignored',reason:'canonical_b2b_solution_unavailable'};

  const canonical={
    source:'commerce',event_type:eventType,schema_version:2,occurred_at:occurredAt,
    journey_id:journeyId,solution_id:String(solution.solution_id),
    value_minor:valueMinor,currency,privacy_class:'pseudonymous',metadata
  };
  const payloadHash=await sha256(stableJson(canonical));
  const existing=await db.prepare(
    "SELECT event_id,payload_hash FROM events WHERE source='commerce' AND idempotency_key=?1 LIMIT 1"
  ).bind(idempotencyKey).first();
  if(existing){
    if(existing.payload_hash!==payloadHash)throw new Error('idempotency_conflict');
    return {status:'duplicate',event_id:existing.event_id};
  }
  const scope='events:commerce';
  const registry=await db.prepare(
    "SELECT object_id,payload_hash FROM idempotency_registry WHERE scope=?1 AND idempotency_key=?2 LIMIT 1"
  ).bind(scope,idempotencyKey).first();
  if(registry){
    if(registry.payload_hash!==payloadHash)throw new Error('idempotency_conflict');
    return {status:'duplicate',event_id:registry.object_id};
  }

  const eventId='evt_'+uuidv7();
  const metadataJson=JSON.stringify(metadata);
  await db.batch([
    db.prepare(`INSERT INTO events
      (event_id,idempotency_key,event_type,source,schema_version,occurred_at,
       journey_id,solution_id,value_minor,currency,privacy_class,payload_hash,metadata_json)
      VALUES(?1,?2,?3,'commerce',2,?4,?5,?6,?7,?8,'pseudonymous',?9,?10)`
    ).bind(eventId,idempotencyKey,eventType,occurredAt,journeyId,solution.solution_id,valueMinor,currency,payloadHash,metadataJson),
    db.prepare(`INSERT INTO idempotency_registry
      (scope,idempotency_key,object_type,object_id,payload_hash)
      VALUES(?1,?2,'event',?3,?4)`
    ).bind(scope,idempotencyKey,eventId,payloadHash)
  ]);
  return {status:'accepted',event_id:eventId};
}

function normalizeMetadata(raw,allowed){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const unknown=Object.keys(source).filter(key=>!allowed.includes(key));
  if(unknown.length)throw new Error('unsupported_b2b_metadata');
  const out={};
  for(const key of allowed){
    if(source[key]==null||source[key]==='')continue;
    const value=String(source[key]).trim();
    if(value.length>160||!TOKEN_RE.test(value)||EMAIL_RE.test(value))throw new Error('invalid_b2b_metadata');
    out[key]=value;
  }
  return out;
}
function normalizeJourneyId(raw){
  if(raw==null||raw==='')return null;
  const value=String(raw).trim().toLowerCase();
  if(!/^jrn_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))throw new Error('invalid_journey_id');
  return value;
}
function normalizeTime(raw){
  if(raw==null||raw==='')return new Date().toISOString();
  const value=new Date(raw);
  if(Number.isNaN(value.getTime()))throw new Error('invalid_occurred_at');
  return value.toISOString();
}
function stableJson(value){
  const sort=v=>Array.isArray(v)?v.map(sort):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v);
  return JSON.stringify(sort(value));
}
async function sha256(text){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function uuidv7(){
  const b=crypto.getRandomValues(new Uint8Array(16));
  let t=Date.now();
  for(let i=5;i>=0;i--){b[i]=t&255;t=Math.floor(t/256);}
  b[6]=(b[6]&15)|112;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
