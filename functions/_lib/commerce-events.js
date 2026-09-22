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
