/* MAISON JF® · SOS Maison JF foundation core
   Pure product rules only: no network, persistence, messaging provider or PII. */

export const SOS_PRODUCT={
  id:'sos-maison-jf',
  version:'0.1.0-foundation',
  primaryAction:'ESTOU AQUI',
  defaultCadenceHours:24,
  defaultGraceMinutes:60
};

const HOUR=60*60*1000;
const MINUTE=60*1000;

function ms(value){
  const n=Date.parse(value||'');
  if(!Number.isFinite(n))throw new TypeError('invalid_datetime');
  return n;
}

function configured(snapshot={}){
  return Boolean(snapshot.activated_at && snapshot.trusted_contact_verified===true && snapshot.next_due_at);
}

export function deriveSosState(snapshot={},nowIso=new Date().toISOString()){
  if(snapshot.paused_at)return 'paused';
  if(!configured(snapshot))return 'setup';
  const now=ms(nowIso);
  const due=ms(snapshot.next_due_at);
  const graceMinutes=Number.isFinite(snapshot.grace_minutes)
    ? Math.max(1,Math.floor(snapshot.grace_minutes))
    : SOS_PRODUCT.defaultGraceMinutes;
  if(now<due)return 'safe';
  if(snapshot.reminder_sent_for_due_at!==snapshot.next_due_at)return 'due';
  if(now<due+(graceMinutes*MINUTE))return 'grace';
  return 'contact_due';
}

export function confirmPresence(snapshot={},nowIso=new Date().toISOString()){
  if(!configured(snapshot))throw new Error('sos_not_configured');
  if(snapshot.paused_at)throw new Error('sos_paused');
  const now=ms(nowIso);
  const cadenceHours=Number.isFinite(snapshot.cadence_hours)
    ? Math.max(1,Math.floor(snapshot.cadence_hours))
    : SOS_PRODUCT.defaultCadenceHours;
  const nextDue=new Date(now+(cadenceHours*HOUR)).toISOString();
  return {
    ...snapshot,
    last_checkin_at:new Date(now).toISOString(),
    next_due_at:nextDue,
    reminder_sent_for_due_at:null,
    trusted_notice_sent_for_due_at:null
  };
}

export function decideSosAction(snapshot={},nowIso=new Date().toISOString()){
  const state=deriveSosState(snapshot,nowIso);
  if(state==='due'){
    return {kind:'send_user_reminder',for_due_at:snapshot.next_due_at};
  }
  if(state==='contact_due'){
    if(snapshot.trusted_contact_verified!==true)return {kind:'none',reason:'trusted_contact_not_verified'};
    if(snapshot.trusted_notice_sent_for_due_at===snapshot.next_due_at){
      return {kind:'none',reason:'trusted_notice_already_sent'};
    }
    return {kind:'send_trusted_notice',for_due_at:snapshot.next_due_at};
  }
  return {kind:'none',reason:state};
}

const SIGNALS=new Set([
  'checkin_completed',
  'reminder_sent',
  'trusted_notice_sent',
  'trusted_notice_failed',
  'activated',
  'paused'
]);

const OUTCOMES=new Set(['ok','failed','not_applicable','unknown']);

export function buildSosAggregateSignal({
  signalKind,
  count,
  cadenceBucket='daily',
  deliveryOutcome='not_applicable',
  productVersion=SOS_PRODUCT.version
}={}){
  if(!SIGNALS.has(signalKind))throw new Error('invalid_sos_signal_kind');
  if(!Number.isInteger(count)||count<0)throw new Error('invalid_sos_signal_count');
  if(!/^[a-z0-9_-]{1,40}$/.test(cadenceBucket))throw new Error('invalid_sos_cadence_bucket');
  if(!OUTCOMES.has(deliveryOutcome))throw new Error('invalid_sos_delivery_outcome');
  return {
    event_type:'sos.aggregate',
    source:'sos_product',
    privacy_class:'aggregated',
    metadata:{
      product_id:SOS_PRODUCT.id,
      signal_kind:signalKind,
      cadence_bucket:cadenceBucket,
      delivery_outcome:deliveryOutcome,
      product_version:String(productVersion).slice(0,40),
      count
    }
  };
}
