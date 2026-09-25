import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,requireSosAuth,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import { resumeSos } from '../../_lib/sos-runtime.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const auth=await requireSosAuth(request,env);
    const result=await resumeSos({env,identity:auth.identity});
    return jsonSos({
      ok:true,status:'active',idempotent:result.idempotent,nextDueAt:result.nextDueAt
    });
  });
}
export async function onRequestGet(){return methodNotAllowed()}
