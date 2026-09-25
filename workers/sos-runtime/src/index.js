import { enqueueDueSosActions,claimNextSosAction } from '../../../functions/_lib/sos-runtime.js';
import { deliverClaimedSosAction } from '../../../functions/_lib/sos-delivery.js';

function enabled(value){return String(value||'').toLowerCase()==='true'}
function cap(value){return Math.max(1,Math.min(50,Math.floor(Number(value)||20)))}

export async function runSosScheduler(env,{at=new Date().toISOString(),fetchImpl=fetch}={}){
  if(!enabled(env?.MAISON_SOS_SCHEDULER_ENABLED)){
    return {enabled:false,queued:{userReminders:0,trustedNotices:0},processed:0,sent:0,retried:0,failed:0};
  }

  const queued=(await enqueueDueSosActions({env,at,limit:100})).queued;
  const max=cap(env?.MAISON_SOS_MAX_ACTIONS_PER_TICK);
  let processed=0,sent=0,retried=0,failed=0;

  while(processed<max){
    const action=await claimNextSosAction({env,at});
    if(!action)break;
    processed++;
    try{
      const result=await deliverClaimedSosAction({env,action,at,fetchImpl});
      if(result?.ok)sent++;
      else if(result?.retry)retried++;
      else failed++;
    }catch{
      failed++;
    }
  }
  return {enabled:true,queued,processed,sent,retried,failed};
}

export default {
  scheduled(controller,env,ctx){
    const at=Number.isFinite(controller?.scheduledTime)
      ? new Date(controller.scheduledTime).toISOString()
      : new Date().toISOString();
    ctx.waitUntil(runSosScheduler(env,{at}));
  }
};
