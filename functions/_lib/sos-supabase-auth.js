/* MAISON JF® · SOS Supabase Auth adapter
   Direct server-side token validation. User profile data is discarded except the stable subject
   and an optional already-confirmed email used transiently to seed the encrypted reminder channel. */

const MAX_TOKEN_LENGTH=8192;

function enabled(value){return String(value||'').toLowerCase()==='true'}
function bearer(request){
  const raw=String(request?.headers?.get?.('Authorization')||'');
  return raw.startsWith('Bearer ')?raw.slice(7).trim():'';
}
function projectOrigin(value){
  const url=new URL(String(value||''));
  if(url.protocol!=='https:')throw new Error('sos_auth_url_must_be_https');
  return url.origin;
}

export async function authenticateSosRequest({request,env,fetchImpl=fetch}={}){
  if(!enabled(env?.MAISON_SOS_AUTH_ENABLED))throw new Error('sos_auth_disabled');
  const token=bearer(request);
  if(token.length<20||token.length>MAX_TOKEN_LENGTH)throw new Error('sos_auth_token_missing');
  const origin=projectOrigin(env?.MAISON_SOS_SUPABASE_URL);
  const apiKey=String(env?.MAISON_SOS_SUPABASE_PUBLISHABLE_KEY||'').trim();
  if(apiKey.length<20)throw new Error('sos_auth_publishable_key_missing');

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  let response;
  try{
    response=await fetchImpl(origin+'/auth/v1/user',{
      method:'GET',
      headers:{
        'accept':'application/json',
        'apikey':apiKey,
        'authorization':'Bearer '+token
      },
      redirect:'error',
      signal:controller.signal
    });
  }finally{
    clearTimeout(timer);
  }
  if(!response.ok){
    if(response.status===401)throw new Error('sos_auth_unauthorized');
    if(response.status===403)throw new Error('sos_auth_upstream_403');
    if(response.status===404)throw new Error('sos_auth_upstream_404');
    if(response.status===429)throw new Error('sos_auth_upstream_429');
    if(response.status>=500)throw new Error('sos_auth_upstream_5xx');
    throw new Error('sos_auth_upstream_'+response.status);
  }
  const user=await response.json().catch(()=>null);
  const subject=String(user?.id||'').trim();
  if(subject.length<8||subject.length>200)throw new Error('sos_auth_subject_invalid');

  const email=String(user?.email||'').trim().toLowerCase();
  const confirmed=Boolean(user?.email_confirmed_at||user?.confirmed_at);
  const reminder=(confirmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=254)
    ? {kind:'email',value:email,verified:true}
    : null;

  return {
    identity:{provider:'supabase',subject,verified:true},
    reminder
  };
}
