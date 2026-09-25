import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,readSosJson,requireSosAuth,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import {
  configureSosAccount,setSosUserReminderEndpoint,createTrustedContactInvite
} from '../../_lib/sos-runtime.js';
import { sendSosBrevoEmail } from '../../_lib/sos-brevo.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const auth=await requireSosAuth(request,env);
    if(!auth.reminder?.verified||auth.reminder.kind!=='email'){
      return jsonSos({ok:false,error:'confirmed_email_required'},409);
    }
    const body=await readSosJson(request);
    const timezone=String(body.timezone||'');
    const checkinLocalTime=String(body.checkinLocalTime||'');
    const trustedContactEmail=String(body.trustedContactEmail||'');
    const graceMinutes=body.graceMinutes==null?60:Number(body.graceMinutes);

    await configureSosAccount({env,identity:auth.identity,timezone,checkinLocalTime,graceMinutes});
    await setSosUserReminderEndpoint({env,identity:auth.identity,endpoint:auth.reminder.value});
    const invite=await createTrustedContactInvite({
      env,identity:auth.identity,endpointKind:'email',endpoint:trustedContactEmail
    });

    await sendSosBrevoEmail({
      env,to:trustedContactEmail,kind:'trusted_invite',
      inviteToken:invite.token,expiresAt:invite.expiresAt
    });

    return jsonSos({
      ok:true,status:'contact_pending',inviteExpiresAt:invite.expiresAt
    },202);
  });
}
export async function onRequestGet(){return methodNotAllowed()}
