import {
  jsonSos,requireSosApiEnabled,requireSosAuth,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import { getSosStatus } from '../../_lib/sos-runtime.js';

export async function onRequestGet({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    const auth=await requireSosAuth(request,env);
    return jsonSos({ok:true,...await getSosStatus({env,identity:auth.identity})});
  });
}
export async function onRequestPost(){return methodNotAllowed()}
