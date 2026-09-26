/* MAISON JF® · SOS Resend transactional email adapter
   Disabled by default. Plain-text only; no recipient names, no analytics payloads. */

function enabled(value){return String(value||'').toLowerCase()==='true'}
function cleanEmail(value){
  const email=String(value||'').trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('invalid_sos_email');
  return email;
}
function publicBase(env){
  const url=new URL(String(env?.MAISON_SOS_PUBLIC_URL||''));
  if(url.protocol!=='https:')throw new Error('sos_public_url_must_be_https');
  return url.origin;
}

export function sosEmailCopy(kind,{env,inviteToken,expiresAt}={}){
  const base=publicBase(env);
  if(kind==='user_reminder')return {
    subject:'SOS Maison JF · está na hora do teu check-in',
    text:'Está na hora do teu check-in. Abre o SOS Maison JF e toca em “ESTOU AQUI”.\n\n'+base+'/sos/'
  };
  if(kind==='trusted_invite'){
    const token=String(inviteToken||'');
    if(token.length<20)throw new Error('sos_invite_token_missing');
    return {
      subject:'Convite · contacto de confiança SOS Maison JF',
      text:'Alguém escolheu-te como contacto de confiança no SOS Maison JF. Aceita apenas se concordares em receber um aviso quando o check-in combinado não for confirmado.\n\nAceitar: '+base+'/sos/aceitar#token='+encodeURIComponent(token)+'\n\nO convite expira em '+String(expiresAt||'')+'.\n\nO SOS Maison JF não é um serviço de emergência.'
    };
  }
  if(kind==='trusted_notice')return {
    subject:'SOS Maison JF · check-in não confirmado',
    text:'O check-in combinado no SOS Maison JF não foi confirmado dentro da margem definida. Isto não significa necessariamente que exista uma emergência. Se conseguires, tenta contactar a pessoa pelos meios que normalmente usas.\n\nO SOS Maison JF não monitoriza localização nem substitui serviços de emergência.'
  };
  throw new Error('invalid_sos_email_kind');
}

export async function sendSosResendEmail({env,to,kind,inviteToken=null,expiresAt=null,fetchImpl=fetch}={}){
  if(!enabled(env?.MAISON_SOS_RESEND_ENABLED))throw new Error('sos_resend_disabled');
  const apiKey=String(env?.MAISON_SOS_RESEND_API_KEY||'').trim();
  if(apiKey.length<20)throw new Error('sos_resend_key_missing');
  const sender=cleanEmail(env?.MAISON_SOS_RESEND_SENDER_EMAIL||'sos@maison-jf.com');
  const recipient=cleanEmail(to);
  const copy=sosEmailCopy(kind,{env,inviteToken,expiresAt});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  let response;
  try{
    response=await fetchImpl('https://api.resend.com/emails',{
      method:'POST',
      headers:{'accept':'application/json','authorization':'Bearer '+apiKey,'content-type':'application/json'},
      body:JSON.stringify({from:'SOS Maison JF <'+sender+'>',to:[recipient],subject:copy.subject,text:copy.text,tags:[{name:'product',value:'sos-maison-jf'},{name:'kind',value:kind}]}),
      redirect:'error',signal:controller.signal
    });
  }finally{clearTimeout(timer)}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(response.status===429||response.status>=500?'sos_delivery_temporary_failure':'sos_delivery_permanent_failure');
    error.status=response.status;throw error;
  }
  const messageId=String(data?.id||'').slice(0,300);
  if(!messageId)throw new Error('sos_delivery_receipt_missing');
  return {provider:'resend',messageId};
}
