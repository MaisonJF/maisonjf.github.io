import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,requireSosAuth,requireIdempotencyKey,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import { checkInSos } from '../../_lib/sos-runtime.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const auth=await requireSosAuth(request,env);
    const idempotencyKey=requireIdempotencyKey(request);
    const result=await checkInSos({env,identity:auth.identity,idempotencyKey});
    return jsonSos({
      ok:true,idempotent:result.idempotent,nextDueAt:result.nextDueAt
    });
  });
}
export async function onRequestGet(){return methodNotAllowed()}
