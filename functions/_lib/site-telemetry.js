const EVENT_POLICIES={
  'page.view':{
    required:['path'],
    allowed:['path','referrer_host','campaign_id','surface']
  },
  'cta.click':{
    required:['path','cta_id'],
    allowed:['path','cta_id','campaign_id','surface']
  },
  'navigation.click':{
    required:['path','navigation_id','target_path'],
    allowed:['path','navigation_id','target_path','surface']
  },
  'offer.exposure':{
    required:['path','surface','offer_id'],
    allowed:['path','surface','offer_id','recommendation_source','recommendation_result','recommendation_route','recommendation_brain']
  },
  'offer.click':{
    required:['path','surface','offer_id'],
    allowed:['path','surface','offer_id','recommendation_source','recommendation_result','recommendation_route','recommendation_brain']
  }
};
const TOKEN=/^[A-Za-z0-9._:/@+-]{1,120}$/;
const HOST=/^(?=.{1,255}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL=/(?:^|[^A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:$|[^A-Za-z0-9._%+-])/;
const IBAN=/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;

export class SiteTelemetryError extends Error{
  constructor(code,status=400){super(code);this.code=code;this.status=status;}
}

function directPii(value){
  const text=String(value??'');
  if(EMAIL.test(text)||IBAN.test(text))return true;
  const digits=text.replace(/\D/g,'');
  return digits.length>=13&&digits.length<=19&&/(?:\d[ -]?){13,19}/.test(text);
}
function cleanPath(value){
  if(typeof value!=='string')throw new SiteTelemetryError('invalid_path');
  const v=value.trim().split(/[?#]/,1)[0];
  if(!v.startsWith('/')||v.includes('://')||v.length>500)throw new SiteTelemetryError('invalid_path');
  return v;
}
function cleanToken(value,max=120){
  if(typeof value!=='string')throw new SiteTelemetryError('invalid_token');
  const v=value.trim();
  if(v.length<1||v.length>max||!TOKEN.test(v)||directPii(v))throw new SiteTelemetryError('invalid_token');
  return v;
}
function cleanHost(value){
  if(value==null||value==='')return null;
  if(typeof value!=='string')throw new SiteTelemetryError('invalid_referrer_host');
  const v=value.trim().toLowerCase().replace(/\.$/,'');
  if(!HOST.test(v)||directPii(v))throw new SiteTelemetryError('invalid_referrer_host');
  return v;
}

export function normalizeSiteTelemetry(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new SiteTelemetryError('invalid_payload');
  const allowedTop=new Set(['event_type','event_key','consent','metadata']);
  if(Object.keys(body).some(k=>!allowedTop.has(k)))throw new SiteTelemetryError('unknown_field');
  if(body.consent!==true)throw new SiteTelemetryError('analytics_consent_required',403);

  const eventType=String(body.event_type||'').trim().toLowerCase();
  const policy=EVENT_POLICIES[eventType];
  if(!policy)throw new SiteTelemetryError('unsupported_site_event');

  const eventKey=String(body.event_key||'').trim().toLowerCase();
  if(!UUID.test(eventKey))throw new SiteTelemetryError('invalid_event_key');

  const raw=body.metadata;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new SiteTelemetryError('invalid_metadata');
  if(Object.keys(raw).some(k=>!policy.allowed.includes(k)))throw new SiteTelemetryError('metadata_not_allowed');
  for(const key of policy.required){
    if(raw[key]==null||raw[key]==='')throw new SiteTelemetryError('required_metadata_missing');
  }

  const metadata={};
  for(const key of policy.allowed){
    const value=raw[key];
    if(value==null||value==='')continue;
    if(key==='path'||key==='target_path')metadata[key]=cleanPath(value);
    else if(key==='referrer_host')metadata[key]=cleanHost(value);
    else metadata[key]=cleanToken(value,key==='surface'?80:120);
  }
  return {eventType,eventKey,metadata};
}

function configuredA2(env){
  const raw=String(env?.A2_INGEST_URL||'').trim();
  const token=String(env?.A2_INGEST_TOKEN||'').trim();
  if(!raw||!token)return null;
  let url;
  try{url=new URL(raw);}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
  if(url.pathname!=='/internal/a2/ingest')return null;
  return {url:url.toString(),token};
}

export async function forwardSiteTelemetry(env,normalized,fetchImpl=fetch){
  const cfg=configuredA2(env);
  if(!cfg)return {status:'ignored',reason:'a2_unconfigured'};

  const headers={
    'content-type':'application/json',
    'accept':'application/json',
    'authorization':'Bearer '+cfg.token
  };
  const accessId=String(env?.A2_CF_ACCESS_CLIENT_ID||'').trim();
  const accessSecret=String(env?.A2_CF_ACCESS_CLIENT_SECRET||'').trim();
  if(Boolean(accessId)!==Boolean(accessSecret)){
    return {status:'ignored',reason:'a2_access_misconfigured'};
  }
  if(accessId){
    headers['CF-Access-Client-Id']=accessId;
    headers['CF-Access-Client-Secret']=accessSecret;
  }

  const payload={
    contract_version:1,
    source:'site',
    event_type:normalized.eventType,
    occurred_at:new Date().toISOString(),
    idempotency_key:'site:'+normalized.eventType+':'+normalized.eventKey,
    privacy_class:'anonymous',
    metadata:normalized.metadata
  };

  let response;
  try{
    response=await fetchImpl(cfg.url,{
      method:'POST',
      headers,
      body:JSON.stringify(payload),
      redirect:'error'
    });
  }catch{
    return {status:'ignored',reason:'a2_unavailable'};
  }
  if(response.ok)return {status:'forwarded'};
  if(response.status===404||response.status===503)return {status:'ignored',reason:'a2_disabled_or_unavailable'};
  if(response.status===401||response.status===403)return {status:'ignored',reason:'a2_auth_rejected'};
  return {status:'rejected',reason:'a2_rejected'};
}
