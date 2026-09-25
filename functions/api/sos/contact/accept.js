import {
  jsonSos,requireSosApiEnabled,requireSameOrigin,readSosJson,withSosApi,methodNotAllowed
} from '../../../_lib/sos-api.js';
import { acceptTrustedContactInvite } from '../../../_lib/sos-runtime.js';

export async function onRequestPost({request,env}){
  return withSosApi(async ()=>{
    requireSosApiEnabled(env);
    requireSameOrigin(request);
    const body=await readSosJson(request,{maxBytes:2048});
    const token=String(body.token||'');
    if(token.length<20||token.length>256)return jsonSos({ok:false,error:'invalid_invite_token'},400);
    const result=await acceptTrustedContactInvite({env,token});
    return jsonSos({
      ok:true,accepted:true,idempotent:result.idempotent
    });
  });
}
export async function onRequestGet(){return methodNotAllowed()}
