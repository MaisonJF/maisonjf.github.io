export async function recordStripePurchase(db,session){
  if(!db||typeof db.prepare!=='function'||!session||session.payment_status!=='paid'||!session.id)return false;
  const metadata=session.metadata&&typeof session.metadata==='object'?session.metadata:{};
  const eventType='commerce.purchase_confirmed';
  const source='stripe';
  const idempotencyKey='checkout:'+String(session.id);
  const occurredAt=new Date(Number(session.created||Math.floor(Date.now()/1000))*1000).toISOString();
  const valueMinor=Number.isInteger(session.amount_total)?session.amount_total:null;
  const currency=valueMinor!=null?String(session.currency||'EUR').toUpperCase():null;
  const safeMetadata={
    stripe_session_id:String(session.id),
    checkout_source:String(metadata.source||'').slice(0,120),
    product_slug:String(metadata.product_slug||'').slice(0,120),
    product_items:String(metadata.product_items||'').slice(0,450),
    service_slug:String(metadata.service_slug||'').slice(0,120),
    shipping_zone:String(metadata.shipping_zone||'').slice(0,80),
    recommendation_source:String(metadata.rec_source||'').slice(0,120),
    recommendation_offer:String(metadata.rec_offer||'').slice(0,120),
    recommendation_result:String(metadata.rec_result||'').slice(0,120),
    recommendation_route:String(metadata.rec_route||'').slice(0,120),
    recommendation_brain:String(metadata.rec_brain||'').slice(0,120),
    acquisition_referrer:String(metadata.acq_referrer||'').slice(0,160),
    acquisition_landing:String(metadata.acq_landing||'').slice(0,200),
    utm_source:String(metadata.utm_source||'').slice(0,120),
    utm_medium:String(metadata.utm_medium||'').slice(0,120),
    utm_campaign:String(metadata.utm_campaign||'').slice(0,160)
  };
  const metadataJson=JSON.stringify(safeMetadata);
  const digest=await sha256([eventType,source,idempotencyKey,String(valueMinor??''),currency||'',metadataJson].join('|'));
  const eventId='evt_'+digest.slice(0,36);
  await db.prepare(
    `INSERT OR IGNORE INTO events
      (event_id,idempotency_key,event_type,source,schema_version,occurred_at,value_minor,currency,privacy_class,payload_hash,metadata_json)
     VALUES(?1,?2,?3,?4,2,?5,?6,?7,'anonymous',?8,?9)`
  ).bind(eventId,idempotencyKey,eventType,source,occurredAt,valueMinor,currency,digest,metadataJson).run();
  return true;
}

async function sha256(text){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}


export const B2B_SOLUTION_ID='sol_0199a4b2-7f00-7000-8000-000000000001';

const B2B_EVENT_METADATA={
  'b2b.lead':['interest','origin','business','goal','gap','client','model','scale','start','result_type'],
  'b2b.proposal':['b2b_stage','offer_family','origin','business','goal','result_type'],
  'b2b.pilot':['b2b_stage','offer_family','origin','business','goal','result_type'],
  'b2b.purchase':['b2b_stage','offer_family','origin','business','goal','result_type','recurrence_type'],
  'b2b.recurrence':['b2b_stage','offer_family','origin','business','goal','result_type','recurrence_type']
};
const B2B_REQUIRED_METADATA={
  'b2b.lead':[],
  'b2b.proposal':['b2b_stage'],
  'b2b.pilot':['b2b_stage'],
  'b2b.purchase':['b2b_stage'],
  'b2b.recurrence':['b2b_stage','recurrence_type']
};
const B2B_TOKEN=/^[A-Za-z0-9._:/@+-]{1,160}$/;
const DIRECT_EMAIL=/(?:^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:$|[^A-Za-z0-9._%+-])/;
const IBANISH=/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;
const CARDISH=/^\d{13,19}$/;
function containsDirectPii(value){
  return DIRECT_EMAIL.test(value)||IBANISH.test(value)||CARDISH.test(value);
}

export async function recordB2BEvent(db,input={}){
  if(!db||typeof db.prepare!=='function')return false;
  const eventType=String(input.event_type||'').trim().toLowerCase();
  const allowed=B2B_EVENT_METADATA[eventType];
  if(!allowed)throw new Error('unsupported_b2b_event');

  const idempotencyKey=String(input.idempotency_key||'').trim();
  if(idempotencyKey.length<8||idempotencyKey.length>200||containsDirectPii(idempotencyKey))throw new Error('invalid_b2b_idempotency');

  const raw=input.metadata&&typeof input.metadata==='object'&&!Array.isArray(input.metadata)?input.metadata:{};
  const unknown=Object.keys(raw).filter(k=>!allowed.includes(k));
  if(unknown.length)throw new Error('unsupported_b2b_metadata');
  const metadata={};
  for(const key of allowed){
    if(raw[key]==null||raw[key]==='')continue;
    const value=String(raw[key]).trim();
    if(!B2B_TOKEN.test(value)||containsDirectPii(value))throw new Error('invalid_b2b_metadata');
    metadata[key]=value;
  }
  for(const key of B2B_REQUIRED_METADATA[eventType]){
    if(!metadata[key])throw new Error('missing_b2b_metadata');
  }

  const occurredAt=input.occurred_at?new Date(input.occurred_at).toISOString():new Date().toISOString();
  const journeyId=input.journey_id==null?null:String(input.journey_id);
  if(journeyId!=null&&!/^jrn_[0-9a-f-]{36}$/.test(journeyId))throw new Error('invalid_b2b_journey');
  const solutionId=input.solution_id==null?B2B_SOLUTION_ID:String(input.solution_id);
  if(solutionId!==B2B_SOLUTION_ID)throw new Error('invalid_b2b_solution');

  const valueMinor=input.value_minor==null?null:Number(input.value_minor);
  if(valueMinor!=null&&(!Number.isInteger(valueMinor)||valueMinor<0))throw new Error('invalid_b2b_value');
  const currency=valueMinor==null?null:String(input.currency||'EUR').trim().toUpperCase();
  if(currency!=null&&!/^[A-Z]{3}$/.test(currency))throw new Error('invalid_b2b_currency');

  const metadataJson=JSON.stringify(Object.fromEntries(Object.entries(metadata).sort(([a],[b])=>a.localeCompare(b))));
  const digest=await sha256([eventType,'commerce',idempotencyKey,journeyId||'',solutionId,String(valueMinor??''),currency||'',metadataJson].join('|'));
  const eventId='evt_'+digest.slice(0,36);

  const existing=await db.prepare(
    `SELECT event_id,payload_hash FROM events WHERE source='commerce' AND idempotency_key=?1 LIMIT 1`
  ).bind(idempotencyKey).first();
  if(existing){
    if(existing.payload_hash!==digest)throw new Error('b2b_idempotency_conflict');
    return {ok:true,duplicate:true,event_id:existing.event_id};
  }

  await db.prepare(
    `INSERT INTO events
      (event_id,idempotency_key,event_type,source,schema_version,occurred_at,journey_id,solution_id,
       value_minor,currency,privacy_class,payload_hash,metadata_json)
     VALUES(?1,?2,?3,'commerce',2,?4,?5,?6,?7,?8,'pseudonymous',?9,?10)`
  ).bind(eventId,idempotencyKey,eventType,occurredAt,journeyId,solutionId,valueMinor,currency,digest,metadataJson).run();
  return {ok:true,duplicate:false,event_id:eventId};
}
