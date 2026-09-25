import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,requireSosAuth,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import { pauseSos } from '../../_lib/sos-runtime.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const auth=await requireSosAuth(request,env);
    const result=await pauseSos({env,identity:auth.identity});
    return jsonSos({ok:true,status:'paused',idempotent:result.idempotent});
  });
}
export async function onRequestGet(){return methodNotAllowed()}
