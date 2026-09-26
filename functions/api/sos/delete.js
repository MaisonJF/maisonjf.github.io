import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,readSosJson,requireSosAuth,withSosApi,methodNotAllowed
} from '../../_lib/sos-api.js';
import { deleteSosAccount } from '../../_lib/sos-runtime.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const auth=await requireSosAuth(request,env);
    const body=await readSosJson(request);
    if(body.confirm!=='DELETE_SOS')return jsonSos({ok:false,error:'delete_confirmation_required'},400);
    await deleteSosAccount({env,identity:auth.identity});
    return jsonSos({ok:true,status:'deleted'});
  });
}
export async function onRequestGet(){return methodNotAllowed()}
