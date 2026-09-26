import { authenticateSosRequest } from './sos-supabase-auth.js';

const MAX_JSON_BYTES=8*1024;

function enabled(value){return String(value||'').toLowerCase()==='true'}

export function jsonSos(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'private, no-store, max-age=0',
      'pragma':'no-cache',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer',
      'content-security-policy':"default-src 'none'; frame-ancestors 'none'"
    }
  });
}

export function requireSosApiEnabled(env){
  if(!enabled(env?.MAISON_SOS_API_ENABLED)){
    const error=new Error('sos_api_disabled');
    error.status=404;
    throw error;
  }
}

export function requireSameOrigin(request){
  const origin=request.headers.get('Origin');
  if(!origin)return;
  const target=new URL(request.url).origin;
  let supplied;
  try{supplied=new URL(origin).origin}catch{throw Object.assign(new Error('sos_origin_forbidden'),{status:403})}
  if(supplied!==target)throw Object.assign(new Error('sos_origin_forbidden'),{status:403});
}

export async function readSosJson(request,{maxBytes=MAX_JSON_BYTES}={}){
  const type=String(request.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('application/json'))throw Object.assign(new Error('sos_json_required'),{status:415});
  const declared=Number(request.headers.get('content-length')||'0');
  if(declared&&declared>maxBytes)throw Object.assign(new Error('sos_body_too_large'),{status:413});
  const raw=await request.text();
  if(new Blob([raw]).size>maxBytes)throw Object.assign(new Error('sos_body_too_large'),{status:413});
  try{
    const body=JSON.parse(raw||'{}');
    if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();
    return body;
  }catch{
    throw Object.assign(new Error('sos_invalid_json'),{status:400});
  }
}

export async function requireSosAuth(request,env,fetchImpl=fetch){
  try{return await authenticateSosRequest({request,env,fetchImpl})}
  catch(error){
    const code=String(error?.message||'');
    if(code==='sos_auth_unauthorized'||code==='sos_auth_token_missing'){
      throw Object.assign(new Error('sos_unauthorized'),{status:401});
    }
    if(code==='sos_auth_disabled')throw Object.assign(new Error('sos_auth_unavailable'),{status:503});
    if(/^sos_auth_upstream_(403|404|429|5xx|[2-5][0-9][0-9])$/.test(code)){
      throw Object.assign(new Error(code),{status:503});
    }
    throw Object.assign(new Error('sos_auth_unavailable'),{status:503});
  }
}

export function requireIdempotencyKey(request){
  const key=String(request.headers.get('Idempotency-Key')||'').trim();
  if(key.length<8||key.length>120)throw Object.assign(new Error('sos_idempotency_key_required'),{status:400});
  return key;
}

export function sosApiError(error){
  const code=String(error?.message||'sos_request_failed');
  const explicit=Number(error?.status);
  if(Number.isInteger(explicit)&&explicit>=400&&explicit<=599)return {status:explicit,code};

  const map={
    sos_account_not_configured:404,
    sos_not_active:409,
    sos_trusted_contact_not_verified:409,
    sos_user_reminder_not_verified:409,
    sos_invite_not_found:404,
    sos_invite_revoked:410,
    sos_invite_expired:410,
    sos_invite_already_accepted:409,
    invalid_sos_contact_endpoint:400,
    invalid_sos_contact_kind:400,
    invalid_sos_timezone:400,
    invalid_sos_local_time:400,
    invalid_sos_grace_minutes:400,
    invalid_sos_idempotency_key:400,
    sos_brevo_disabled:503,
    sos_brevo_key_missing:503,
    sos_delivery_temporary_failure:503,
    sos_delivery_permanent_failure:502,
    sos_db_unavailable:503
  };
  return {status:map[code]||500,code:map[code]?code:'sos_request_failed'};
}

export async function withSosApi(handler){
  try{return await handler()}
  catch(error){
    const mapped=sosApiError(error);
    return jsonSos({ok:false,error:mapped.code},mapped.status);
  }
}

export function methodNotAllowed(){
  return jsonSos({ok:false,error:'method_not_allowed'},405);
}
