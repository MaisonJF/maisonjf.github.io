/* MAISON JF® · SOS identity boundary
   Accepts only an already verified upstream identity. Raw subjects are never persisted. */

function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}

export function requireVerifiedSosIdentity(identity={}){
  const provider=String(identity.provider||'').trim().toLowerCase();
  const subject=String(identity.subject||'').trim();
  if(identity.verified!==true)throw new Error('sos_identity_not_verified');
  if(!/^[a-z0-9._-]{2,40}$/.test(provider))throw new Error('invalid_sos_identity_provider');
  if(subject.length<1||subject.length>512)throw new Error('invalid_sos_identity_subject');
  return {provider,subject,verified:true};
}

export async function sosAccountRef(env,identity){
  const clean=requireVerifiedSosIdentity(identity);
  const pepper=String(env?.MAISON_SOS_SUBJECT_PEPPER||'');
  if(pepper.length<32)throw new Error('sos_subject_pepper_missing');
  const key=await crypto.subtle.importKey(
    'raw',new TextEncoder().encode(pepper),
    {name:'HMAC',hash:'SHA-256'},false,['sign']
  );
  const signed=await crypto.subtle.sign(
    'HMAC',key,new TextEncoder().encode(clean.provider+'\u0000'+clean.subject)
  );
  return 'sua_'+hex(new Uint8Array(signed)).slice(0,36);
}
