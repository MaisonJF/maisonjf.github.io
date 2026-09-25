import { sosAccountRef } from './sos-auth.js';
import { encryptSosSecret, decryptSosSecret } from './sos-crypto.js';

const HOUR=60*60*1000;
const MINUTE=60*1000;

function nowIso(value){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error('invalid_datetime');return new Date(n).toISOString()}
function plus(iso,ms){return new Date(Date.parse(iso)+ms).toISOString()}
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function opaqueId(prefix){const bytes=crypto.getRandomValues(new Uint8Array(18));return prefix+hex(bytes)}
async function sha256Hex(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));return hex(new Uint8Array(bytes))}
function validateTimezone(value){const tz=String(value||'').trim();try{new Intl.DateTimeFormat('pt-PT',{timeZone:tz}).format(new Date())}catch{throw new Error('invalid_sos_timezone')}return tz}
function validateGrace(value){const n=Number(value??60);if(!Number.isInteger(n)||n<15||n>240)throw new Error('invalid_sos_grace_minutes');return n}
function validateIdempotency(value){const key=String(value||'').trim();if(key.length<8||key.length>120)throw new Error('invalid_sos_idempotency_key');return key}
function normalizeEndpoint(kind,value){
  const k=String(kind||'').toLowerCase();
  const raw=String(value||'').trim();
  if(k==='email'){
    const v=raw.toLowerCase();
    if(v.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('invalid_sos_contact_endpoint');
    return {kind:k,value:v};
  }
  if(k==='phone'){
    const v=raw.replace(/[\s().-]/g,'');
    if(!/^\+[1-9]\d{7,14}$/.test(v))throw new Error('invalid_sos_contact_endpoint');
    return {kind:k,value:v};
  }
  throw new Error('invalid_sos_contact_kind');
}

export function requireSosDb(env){
  const db=env?.MAISON_SOS_DB;
  if(!db||typeof db.prepare!=='function')throw new Error('sos_db_unavailable');
  return db;
}

async function accountFor(db,accountRef){
  return await db.prepare('SELECT * FROM sos_accounts WHERE account_ref=?1 LIMIT 1').bind(accountRef).first();
}

export async function configureSosAccount({env,identity,timezone,graceMinutes=60,at=new Date().toISOString()}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const when=nowIso(at);
  const tz=validateTimezone(timezone);
  const grace=validateGrace(graceMinutes);
  await db.prepare(`
    INSERT INTO sos_accounts(account_ref,timezone,cadence_hours,grace_minutes,status,created_at,updated_at)
    VALUES(?1,?2,24,?3,'setup',?4,?4)
    ON CONFLICT(account_ref) DO UPDATE SET
      timezone=excluded.timezone,
      cadence_hours=24,
      grace_minutes=excluded.grace_minutes,
      status=CASE WHEN sos_accounts.status='deleted' THEN 'setup' ELSE sos_accounts.status END,
      deleted_at=CASE WHEN sos_accounts.status='deleted' THEN NULL ELSE sos_accounts.deleted_at END,
      updated_at=excluded.updated_at
  `).bind(accountRef,tz,grace,when).run();
  return {accountRef,status:(await accountFor(db,accountRef))?.status||'setup'};
}

export async function setSosUserReminderEndpoint({
  env,identity,endpoint,at=new Date().toISOString()
}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const account=await accountFor(db,accountRef);
  if(!account||account.status==='deleted')throw new Error('sos_account_not_configured');
  const when=nowIso(at);
  const clean=normalizeEndpoint('email',endpoint);
  const channelRef=opaqueId('suc_');
  const encrypted=await encryptSosSecret(env,clean.value,{aad:[accountRef,channelRef,clean.kind].join('|')});
  await db.batch([
    db.prepare(`UPDATE sos_user_channels SET revoked_at=?1,updated_at=?1
      WHERE account_ref=?2 AND revoked_at IS NULL`).bind(when,accountRef),
    db.prepare(`INSERT INTO sos_user_channels(
      channel_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv,crypto_version,
      verification_source,verified_at,created_at,updated_at
    ) VALUES(?1,?2,'email',?3,?4,?5,'auth_provider',?6,?6,?6)`).bind(
      channelRef,accountRef,encrypted.ciphertext,encrypted.iv,encrypted.version,when
    )
  ]);
  return {channelRef};
}

export async function getSosStatus({env,identity}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const account=await accountFor(db,accountRef);
  if(!account||account.status==='deleted'){
    return {
      configured:false,status:'setup',trustedContactVerified:false,
      reminderChannelVerified:false,nextDueAt:null,lastCheckinAt:null
    };
  }
  const [contact,channel]=await Promise.all([
    db.prepare(`SELECT verified_at FROM sos_trusted_contacts
      WHERE account_ref=?1 AND revoked_at IS NULL LIMIT 1`).bind(accountRef).first(),
    db.prepare(`SELECT verified_at FROM sos_user_channels
      WHERE account_ref=?1 AND revoked_at IS NULL LIMIT 1`).bind(accountRef).first()
  ]);
  return {
    configured:true,
    status:account.status,
    trustedContactVerified:Boolean(contact?.verified_at),
    reminderChannelVerified:Boolean(channel?.verified_at),
    timezone:account.timezone,
    cadenceHours:Number(account.cadence_hours||24),
    graceMinutes:Number(account.grace_minutes||60),
    nextDueAt:account.next_due_at||null,
    lastCheckinAt:account.last_checkin_at||null,
    paused:Boolean(account.paused_at)
  };
}

export async function pauseSos({env,identity,at=new Date().toISOString()}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const account=await accountFor(db,accountRef);
  if(!account||account.status==='deleted')throw new Error('sos_account_not_configured');
  if(account.status==='paused')return {ok:true,idempotent:true};
  const when=nowIso(at);
  await db.batch([
    db.prepare(`UPDATE sos_accounts
      SET status='paused',paused_at=?1,next_due_at=NULL,updated_at=?1
      WHERE account_ref=?2 AND status<>'deleted'`).bind(when,accountRef),
    db.prepare(`UPDATE sos_due_windows SET state='cancelled',completed_at=?1
      WHERE account_ref=?2 AND state='open'`).bind(when,accountRef),
    db.prepare(`UPDATE sos_outbox SET state='cancelled',updated_at=?1,claim_expires_at=NULL
      WHERE state IN ('pending','claimed') AND due_ref IN
        (SELECT due_ref FROM sos_due_windows WHERE account_ref=?2)`).bind(when,accountRef)
  ]);
  return {ok:true,idempotent:false};
}

export async function resumeSos({env,identity,at=new Date().toISOString()}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const account=await accountFor(db,accountRef);
  if(!account||account.status==='deleted')throw new Error('sos_account_not_configured');
  if(account.status==='active'&&account.next_due_at)return {ok:true,idempotent:true,nextDueAt:account.next_due_at};
  const [contact,channel]=await Promise.all([
    db.prepare(`SELECT contact_ref FROM sos_trusted_contacts
      WHERE account_ref=?1 AND verified_at IS NOT NULL AND revoked_at IS NULL LIMIT 1`).bind(accountRef).first(),
    db.prepare(`SELECT channel_ref FROM sos_user_channels
      WHERE account_ref=?1 AND verified_at IS NOT NULL AND revoked_at IS NULL LIMIT 1`).bind(accountRef).first()
  ]);
  if(!contact)throw new Error('sos_trusted_contact_not_verified');
  if(!channel)throw new Error('sos_user_reminder_not_verified');
  const when=nowIso(at);
  const dueAt=plus(when,Number(account.cadence_hours||24)*HOUR);
  const graceUntil=plus(dueAt,Number(account.grace_minutes||60)*MINUTE);
  const dueRef=opaqueId('sdw_');
  await db.batch([
    db.prepare(`UPDATE sos_accounts
      SET status='active',paused_at=NULL,activated_at=COALESCE(activated_at,?1),
          next_due_at=?2,updated_at=?1
      WHERE account_ref=?3 AND status<>'deleted'`).bind(when,dueAt,accountRef),
    db.prepare(`INSERT INTO sos_due_windows(due_ref,account_ref,due_at,grace_until_at,state,created_at)
      VALUES(?1,?2,?3,?4,'open',?5)`).bind(dueRef,accountRef,dueAt,graceUntil,when)
  ]);
  return {ok:true,idempotent:false,nextDueAt:dueAt};
}

export async function deleteSosAccount({env,identity}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  await db.prepare('DELETE FROM sos_accounts WHERE account_ref=?1').bind(accountRef).run();
  return {ok:true};
}

export async function createTrustedContactInvite({
  env,identity,endpointKind,endpoint,at=new Date().toISOString(),ttlHours=48
}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const account=await accountFor(db,accountRef);
  if(!account||account.status==='deleted')throw new Error('sos_account_not_configured');
  const when=nowIso(at);
  const ttl=Number(ttlHours);
  if(!Number.isInteger(ttl)||ttl<1||ttl>168)throw new Error('invalid_sos_invite_ttl');
  const clean=normalizeEndpoint(endpointKind,endpoint);
  const contactRef=opaqueId('sct_');
  const inviteRef=opaqueId('sin_');
  const tokenBytes=crypto.getRandomValues(new Uint8Array(32));
  const token=encodeToken(tokenBytes);
  const tokenHash=await sha256Hex(token);
  const expiresAt=plus(when,ttl*HOUR);
  const encrypted=await encryptSosSecret(env,clean.value,{aad:[accountRef,contactRef,clean.kind].join('|')});

  await db.batch([
    db.prepare(`UPDATE sos_contact_invites
      SET revoked_at=?1
      WHERE accepted_at IS NULL AND revoked_at IS NULL
        AND contact_ref IN (SELECT contact_ref FROM sos_trusted_contacts WHERE account_ref=?2)`).bind(when,accountRef),
    db.prepare(`UPDATE sos_trusted_contacts SET revoked_at=?1,updated_at=?1
      WHERE account_ref=?2 AND revoked_at IS NULL`).bind(when,accountRef),
    db.prepare(`UPDATE sos_due_windows SET state='cancelled',completed_at=?1
      WHERE account_ref=?2 AND state='open'`).bind(when,accountRef),
    db.prepare(`UPDATE sos_outbox SET state='cancelled',updated_at=?1
      WHERE state IN ('pending','claimed') AND due_ref IN
        (SELECT due_ref FROM sos_due_windows WHERE account_ref=?2)`).bind(when,accountRef),
    db.prepare(`INSERT INTO sos_trusted_contacts(
      contact_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv,crypto_version,created_at,updated_at
    ) VALUES(?1,?2,?3,?4,?5,?6,?7,?7)`).bind(
      contactRef,accountRef,clean.kind,encrypted.ciphertext,encrypted.iv,encrypted.version,when
    ),
    db.prepare(`INSERT INTO sos_contact_invites(invite_ref,contact_ref,token_hash,expires_at,created_at)
      VALUES(?1,?2,?3,?4,?5)`).bind(inviteRef,contactRef,tokenHash,expiresAt,when),
    db.prepare(`UPDATE sos_accounts SET status='setup',activated_at=NULL,paused_at=NULL,next_due_at=NULL,updated_at=?1
      WHERE account_ref=?2`).bind(when,accountRef)
  ]);

  return {inviteRef,token,expiresAt,contactRef};
}

export async function acceptTrustedContactInvite({env,token,at=new Date().toISOString()}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const tokenHash=await sha256Hex(String(token||''));
  const row=await db.prepare(`
    SELECT i.invite_ref,i.expires_at,i.accepted_at,i.revoked_at,c.contact_ref,c.account_ref,c.revoked_at AS contact_revoked,
           a.cadence_hours,a.grace_minutes,a.status
    FROM sos_contact_invites i
    JOIN sos_trusted_contacts c ON c.contact_ref=i.contact_ref
    JOIN sos_accounts a ON a.account_ref=c.account_ref
    WHERE i.token_hash=?1 LIMIT 1
  `).bind(tokenHash).first();
  if(!row)throw new Error('sos_invite_not_found');
  if(row.revoked_at||row.contact_revoked)throw new Error('sos_invite_revoked');
  if(Date.parse(row.expires_at)<Date.parse(when))throw new Error('sos_invite_expired');
  if(row.accepted_at)return {accepted:true,idempotent:true,inviteRef:row.invite_ref};
  const reminder=await db.prepare(`SELECT channel_ref FROM sos_user_channels
    WHERE account_ref=?1 AND verified_at IS NOT NULL AND revoked_at IS NULL LIMIT 1`)
    .bind(row.account_ref).first();
  if(!reminder)throw new Error('sos_user_reminder_not_verified');

  const dueAt=plus(when,Number(row.cadence_hours||24)*HOUR);
  const graceUntil=plus(dueAt,Number(row.grace_minutes||60)*MINUTE);
  const dueRef=opaqueId('sdw_');
  await db.batch([
    db.prepare('UPDATE sos_contact_invites SET accepted_at=?1 WHERE invite_ref=?2 AND accepted_at IS NULL').bind(when,row.invite_ref),
    db.prepare('UPDATE sos_trusted_contacts SET verified_at=?1,updated_at=?1 WHERE contact_ref=?2 AND verified_at IS NULL').bind(when,row.contact_ref),
    db.prepare(`UPDATE sos_accounts SET status='active',activated_at=COALESCE(activated_at,?1),paused_at=NULL,next_due_at=?2,updated_at=?1
      WHERE account_ref=?3 AND status<>'deleted'`).bind(when,dueAt,row.account_ref),
    db.prepare(`INSERT OR IGNORE INTO sos_due_windows(due_ref,account_ref,due_at,grace_until_at,state,created_at)
      VALUES(?1,?2,?3,?4,'open',?5)`).bind(dueRef,row.account_ref,dueAt,graceUntil,when)
  ]);
  return {accepted:true,idempotent:false,inviteRef:row.invite_ref,nextDueAt:dueAt};
}

export async function declineTrustedContactInvite({env,token,at=new Date().toISOString()}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const tokenHash=await sha256Hex(String(token||''));
  const row=await db.prepare(`
    SELECT i.invite_ref,i.accepted_at,i.revoked_at,c.contact_ref,c.account_ref,c.revoked_at AS contact_revoked
    FROM sos_contact_invites i
    JOIN sos_trusted_contacts c ON c.contact_ref=i.contact_ref
    WHERE i.token_hash=?1 LIMIT 1
  `).bind(tokenHash).first();
  if(!row)throw new Error('sos_invite_not_found');
  if(row.accepted_at)throw new Error('sos_invite_already_accepted');
  if(row.revoked_at||row.contact_revoked)return {declined:true,idempotent:true};
  await db.batch([
    db.prepare('UPDATE sos_contact_invites SET revoked_at=?1 WHERE invite_ref=?2 AND revoked_at IS NULL')
      .bind(when,row.invite_ref),
    db.prepare('UPDATE sos_trusted_contacts SET revoked_at=?1,updated_at=?1 WHERE contact_ref=?2 AND revoked_at IS NULL')
      .bind(when,row.contact_ref),
    db.prepare(`UPDATE sos_accounts SET status='setup',activated_at=NULL,paused_at=NULL,next_due_at=NULL,updated_at=?1
      WHERE account_ref=?2 AND status<>'deleted'`).bind(when,row.account_ref)
  ]);
  return {declined:true,idempotent:false};
}

export async function checkInSos({
  env,identity,idempotencyKey,at=new Date().toISOString()
}={}){
  const db=requireSosDb(env);
  const accountRef=await sosAccountRef(env,identity);
  const key=validateIdempotency(idempotencyKey);
  const existing=await db.prepare(`
    SELECT c.checkin_ref,c.occurred_at,w.due_at AS next_due_at
    FROM sos_checkins c JOIN sos_due_windows w ON w.due_ref=c.due_ref_after
    WHERE c.account_ref=?1 AND c.idempotency_key=?2 LIMIT 1
  `).bind(accountRef,key).first();
  if(existing)return {ok:true,idempotent:true,checkinRef:existing.checkin_ref,nextDueAt:existing.next_due_at};

  const account=await accountFor(db,accountRef);
  if(!account||account.status!=='active'||!account.next_due_at)throw new Error('sos_not_active');
  const verified=await db.prepare(`
    SELECT contact_ref FROM sos_trusted_contacts
    WHERE account_ref=?1 AND verified_at IS NOT NULL AND revoked_at IS NULL LIMIT 1
  `).bind(accountRef).first();
  if(!verified)throw new Error('sos_trusted_contact_not_verified');

  const when=nowIso(at);
  const previous=await db.prepare(`
    SELECT due_ref FROM sos_due_windows WHERE account_ref=?1 AND due_at=?2 LIMIT 1
  `).bind(accountRef,account.next_due_at).first();
  const nextDueAt=plus(when,Number(account.cadence_hours||24)*HOUR);
  const graceUntil=plus(nextDueAt,Number(account.grace_minutes||60)*MINUTE);
  const nextDueRef=opaqueId('sdw_');
  const checkinRef=opaqueId('sci_');

  const statements=[
    db.prepare(`INSERT INTO sos_due_windows(due_ref,account_ref,due_at,grace_until_at,state,created_at)
      VALUES(?1,?2,?3,?4,'open',?5)`).bind(nextDueRef,accountRef,nextDueAt,graceUntil,when),
    db.prepare(`INSERT INTO sos_checkins(checkin_ref,account_ref,idempotency_key,due_ref_before,due_ref_after,occurred_at,created_at)
      VALUES(?1,?2,?3,?4,?5,?6,?6)`).bind(checkinRef,accountRef,key,previous?.due_ref||null,nextDueRef,when),
    db.prepare(`UPDATE sos_accounts SET last_checkin_at=?1,next_due_at=?2,updated_at=?1 WHERE account_ref=?3`)
      .bind(when,nextDueAt,accountRef)
  ];
  if(previous?.due_ref){
    statements.push(db.prepare(`UPDATE sos_due_windows SET state='checked_in',completed_at=?1
      WHERE due_ref=?2 AND state='open'`).bind(when,previous.due_ref));
    statements.push(db.prepare(`UPDATE sos_outbox SET state='cancelled',updated_at=?1
      WHERE due_ref=?2 AND state IN ('pending','claimed')`).bind(when,previous.due_ref));
  }
  await db.batch(statements);
  return {ok:true,idempotent:false,checkinRef,nextDueAt};
}

export async function enqueueDueSosActions({env,at=new Date().toISOString(),limit=50}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const cap=Math.max(1,Math.min(200,Math.floor(Number(limit)||50)));
  const rows=await db.prepare(`
    SELECT d.due_ref,d.due_at,d.grace_until_at,
           r.state AS reminder_state,n.state AS notice_state
    FROM sos_due_windows d
    JOIN sos_accounts a ON a.account_ref=d.account_ref
    JOIN sos_trusted_contacts c ON c.account_ref=d.account_ref
      AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL
    JOIN sos_user_channels u ON u.account_ref=d.account_ref
      AND u.verified_at IS NOT NULL AND u.revoked_at IS NULL
    LEFT JOIN sos_outbox r ON r.due_ref=d.due_ref AND r.action_kind='user_reminder'
    LEFT JOIN sos_outbox n ON n.due_ref=d.due_ref AND n.action_kind='trusted_notice'
    WHERE d.state='open' AND a.status='active' AND d.due_at<=?1
    ORDER BY d.due_at
    LIMIT ?2
  `).bind(when,cap).all();

  let reminders=0,notices=0;
  for(const row of (rows.results||[])){
    if(!row.reminder_state){
      const actionRef=opaqueId('soa_');
      await db.prepare(`INSERT OR IGNORE INTO sos_outbox(action_ref,due_ref,action_kind,state,not_before,created_at,updated_at)
        VALUES(?1,?2,'user_reminder','pending',?3,?4,?4)`).bind(actionRef,row.due_ref,row.due_at,when).run();
      reminders++;
      continue;
    }
    if(row.reminder_state==='sent' && Date.parse(row.grace_until_at)<=Date.parse(when) && !row.notice_state){
      const actionRef=opaqueId('soa_');
      await db.prepare(`INSERT OR IGNORE INTO sos_outbox(action_ref,due_ref,action_kind,state,not_before,created_at,updated_at)
        VALUES(?1,?2,'trusted_notice','pending',?3,?4,?4)`).bind(actionRef,row.due_ref,row.grace_until_at,when).run();
      notices++;
    }
  }
  return {queued:{userReminders:reminders,trustedNotices:notices}};
}

export async function claimNextSosAction({env,at=new Date().toISOString(),leaseMinutes=5}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const lease=Math.max(1,Math.min(15,Math.floor(Number(leaseMinutes)||5)));
  await db.prepare(`UPDATE sos_outbox SET state='pending',claim_expires_at=NULL,updated_at=?1
    WHERE state='claimed' AND claim_expires_at<?1`).bind(when).run();
  for(let i=0;i<5;i++){
    const row=await db.prepare(`SELECT action_ref,due_ref,action_kind FROM sos_outbox
      WHERE state='pending' AND not_before<=?1 ORDER BY not_before,created_at LIMIT 1`).bind(when).first();
    if(!row)return null;
    const leaseUntil=plus(when,lease*MINUTE);
    const result=await db.prepare(`UPDATE sos_outbox
      SET state='claimed',claim_expires_at=?1,attempt_count=attempt_count+1,updated_at=?2
      WHERE action_ref=?3 AND state='pending'`).bind(leaseUntil,when,row.action_ref).run();
    if(Number(result?.meta?.changes||0)===1)return {...row,leaseUntil};
  }
  return null;
}

export async function userReminderTargetForAction({env,actionRef}={}){
  const db=requireSosDb(env);
  const row=await db.prepare(`
    SELECT o.action_ref,o.action_kind,o.state,u.channel_ref,u.account_ref,u.endpoint_kind,
           u.endpoint_ciphertext,u.endpoint_iv,u.crypto_version
    FROM sos_outbox o
    JOIN sos_due_windows d ON d.due_ref=o.due_ref
    JOIN sos_user_channels u ON u.account_ref=d.account_ref
      AND u.verified_at IS NOT NULL AND u.revoked_at IS NULL
    WHERE o.action_ref=?1 LIMIT 1
  `).bind(String(actionRef||'')).first();
  if(!row||row.action_kind!=='user_reminder'||row.state!=='claimed')throw new Error('sos_action_not_deliverable');
  const endpoint=await decryptSosSecret(env,{
    version:row.crypto_version,iv:row.endpoint_iv,ciphertext:row.endpoint_ciphertext
  },{aad:[row.account_ref,row.channel_ref,row.endpoint_kind].join('|')});
  return {endpointKind:row.endpoint_kind,endpoint};
}

export async function trustedContactTargetForAction({env,actionRef}={}){
  const db=requireSosDb(env);
  const row=await db.prepare(`
    SELECT o.action_ref,o.action_kind,o.state,c.contact_ref,c.account_ref,c.endpoint_kind,
           c.endpoint_ciphertext,c.endpoint_iv,c.crypto_version
    FROM sos_outbox o
    JOIN sos_due_windows d ON d.due_ref=o.due_ref
    JOIN sos_trusted_contacts c ON c.account_ref=d.account_ref
      AND c.verified_at IS NOT NULL AND c.revoked_at IS NULL
    WHERE o.action_ref=?1 LIMIT 1
  `).bind(String(actionRef||'')).first();
  if(!row||row.action_kind!=='trusted_notice'||row.state!=='claimed')throw new Error('sos_action_not_deliverable');
  const endpoint=await decryptSosSecret(env,{
    version:row.crypto_version,iv:row.endpoint_iv,ciphertext:row.endpoint_ciphertext
  },{aad:[row.account_ref,row.contact_ref,row.endpoint_kind].join('|')});
  return {endpointKind:row.endpoint_kind,endpoint};
}

export async function releaseSosActionForRetry({
  env,actionRef,errorCode='provider_temporary',at=new Date().toISOString()
}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const row=await db.prepare('SELECT action_ref,state,attempt_count FROM sos_outbox WHERE action_ref=?1 LIMIT 1')
    .bind(String(actionRef||'')).first();
  if(!row)throw new Error('sos_action_not_found');
  if(row.state!=='claimed')throw new Error('sos_action_not_claimed');
  const attempt=Math.max(1,Number(row.attempt_count||1));
  const code=String(errorCode||'provider_temporary').slice(0,120);
  if(attempt>=5){
    await db.prepare(`UPDATE sos_outbox SET state='failed',claim_expires_at=NULL,last_error_code=?1,updated_at=?2
      WHERE action_ref=?3 AND state='claimed'`).bind(code,when,row.action_ref).run();
    return {retry:false,terminal:true};
  }
  const backoffMinutes=Math.min(30,2**(attempt-1));
  const retryAt=plus(when,backoffMinutes*MINUTE);
  await db.prepare(`UPDATE sos_outbox SET state='pending',claim_expires_at=NULL,not_before=?1,last_error_code=?2,updated_at=?3
    WHERE action_ref=?4 AND state='claimed'`).bind(retryAt,code,when,row.action_ref).run();
  return {retry:true,terminal:false,retryAt};
}

export async function completeSosAction({
  env,actionRef,outcome,providerReceiptRef=null,errorCode=null,at=new Date().toISOString()
}={}){
  const db=requireSosDb(env);
  const when=nowIso(at);
  const row=await db.prepare('SELECT action_ref,due_ref,action_kind,state FROM sos_outbox WHERE action_ref=?1 LIMIT 1')
    .bind(String(actionRef||'')).first();
  if(!row)throw new Error('sos_action_not_found');
  if(row.state==='sent')return {ok:true,idempotent:true};
  if(row.state!=='claimed')throw new Error('sos_action_not_claimed');
  if(!['sent','failed'].includes(outcome))throw new Error('invalid_sos_action_outcome');
  const receipt=providerReceiptRef==null?null:String(providerReceiptRef).slice(0,300);
  const code=errorCode==null?null:String(errorCode).slice(0,120);
  const statements=[
    db.prepare(`UPDATE sos_outbox SET state=?1,provider_receipt_ref=?2,last_error_code=?3,
      claim_expires_at=NULL,updated_at=?4,sent_at=CASE WHEN ?1='sent' THEN ?4 ELSE sent_at END
      WHERE action_ref=?5`).bind(outcome,receipt,code,when,row.action_ref)
  ];
  if(outcome==='sent'&&row.action_kind==='trusted_notice'){
    statements.push(db.prepare(`UPDATE sos_due_windows SET state='notified',completed_at=?1
      WHERE due_ref=?2 AND state='open'`).bind(when,row.due_ref));
  }
  await db.batch(statements);
  return {ok:true,idempotent:false};
}

function encodeToken(bytes){
  let raw='';for(const b of bytes)raw+=String.fromCharCode(b);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
