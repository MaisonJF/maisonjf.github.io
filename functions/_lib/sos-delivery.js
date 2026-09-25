import { sendSosBrevoEmail } from './sos-brevo.js';
import {
  trustedContactTargetForAction,
  userReminderTargetForAction,
  completeSosAction,
  releaseSosActionForRetry
} from './sos-runtime.js';

export async function deliverClaimedSosAction({env,action,at=new Date().toISOString(),fetchImpl=fetch}={}){
  if(!action?.action_ref&&!action?.actionRef)throw new Error('sos_action_required');
  const actionRef=action.action_ref||action.actionRef;
  const kind=action.action_kind||action.actionKind;
  try{
    if(kind==='user_reminder'){
      const target=await userReminderTargetForAction({env,actionRef});
      if(target.endpointKind!=='email')throw new Error('sos_user_delivery_channel_unsupported');
      const receipt=await sendSosBrevoEmail({env,to:target.endpoint,kind:'user_reminder',fetchImpl});
      await completeSosAction({env,actionRef,outcome:'sent',providerReceiptRef:receipt.messageId,at});
      return {ok:true,provider:receipt.provider};
    }
    if(kind==='trusted_notice'){
      const target=await trustedContactTargetForAction({env,actionRef});
      if(target.endpointKind!=='email')throw new Error('sos_contact_delivery_channel_unsupported');
      const receipt=await sendSosBrevoEmail({env,to:target.endpoint,kind:'trusted_notice',fetchImpl});
      await completeSosAction({env,actionRef,outcome:'sent',providerReceiptRef:receipt.messageId,at});
      return {ok:true,provider:receipt.provider};
    }
    throw new Error('unsupported_sos_action_kind');
  }catch(error){
    if(error?.message==='sos_delivery_temporary_failure'){
      await releaseSosActionForRetry({env,actionRef,errorCode:'provider_temporary',at});
      return {ok:false,retry:true};
    }
    try{await completeSosAction({env,actionRef,outcome:'failed',errorCode:String(error?.message||'delivery_failed'),at})}catch{}
    throw error;
  }
}
