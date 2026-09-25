import { buildSosAggregateSignal,SOS_PRODUCT } from './sos-maison-core.js';
import { requireSosDb } from './sos-runtime.js';

function day(value){
  const d=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new Error('invalid_sos_aggregate_day');
  const start=new Date(d+'T00:00:00.000Z');
  if(!Number.isFinite(start.getTime())||start.toISOString().slice(0,10)!==d)throw new Error('invalid_sos_aggregate_day');
  const end=new Date(start.getTime()+24*60*60*1000);
  return {date:d,start:start.toISOString(),end:end.toISOString(),occurredAt:new Date(end.getTime()-1).toISOString()};
}

export function buildSosA2AggregateEvent({
  date,signalKind,count,deliveryOutcome='not_applicable',productVersion=SOS_PRODUCT.version
}={}){
  const window=day(date);
  const base=buildSosAggregateSignal({
    signalKind,count,cadenceBucket:'daily',deliveryOutcome,productVersion
  });
  return {
    contract_version:1,
    source:base.source,
    event_type:base.event_type,
    occurred_at:window.occurredAt,
    idempotency_key:['sos-daily',date,signalKind,deliveryOutcome,String(productVersion).slice(0,40)].join(':'),
    privacy_class:base.privacy_class,
    metadata:base.metadata
  };
}

async function count(db,sql,start,end){
  const row=await db.prepare(sql).bind(start,end).first();
  return Math.max(0,Number(row?.n||0));
}

export async function buildSosDailyA2Projection({env,date}={}){
  const db=requireSosDb(env);
  const window=day(date);
  const [checkins,reminders,notices,failed,activated]=await Promise.all([
    count(db,`SELECT COUNT(*) AS n FROM sos_checkins WHERE occurred_at>=?1 AND occurred_at<?2`,window.start,window.end),
    count(db,`SELECT COUNT(*) AS n FROM sos_outbox
      WHERE action_kind='user_reminder' AND state='sent' AND sent_at>=?1 AND sent_at<?2`,window.start,window.end),
    count(db,`SELECT COUNT(*) AS n FROM sos_outbox
      WHERE action_kind='trusted_notice' AND state='sent' AND sent_at>=?1 AND sent_at<?2`,window.start,window.end),
    count(db,`SELECT COUNT(*) AS n FROM sos_outbox
      WHERE action_kind='trusted_notice' AND state='failed' AND updated_at>=?1 AND updated_at<?2`,window.start,window.end),
    count(db,`SELECT COUNT(*) AS n FROM sos_accounts
      WHERE activated_at>=?1 AND activated_at<?2`,window.start,window.end)
  ]);

  return [
    buildSosA2AggregateEvent({date,signalKind:'checkin_completed',count:checkins}),
    buildSosA2AggregateEvent({date,signalKind:'reminder_sent',count:reminders,deliveryOutcome:'ok'}),
    buildSosA2AggregateEvent({date,signalKind:'trusted_notice_sent',count:notices,deliveryOutcome:'ok'}),
    buildSosA2AggregateEvent({date,signalKind:'trusted_notice_failed',count:failed,deliveryOutcome:'failed'}),
    buildSosA2AggregateEvent({date,signalKind:'activated',count:activated})
  ];
}
