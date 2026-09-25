/* MAISON JF® · SOS sensitive-field encryption
   AES-GCM at rest. The 256-bit key exists only as a runtime secret. */

function decodeBase64(value){
  const raw=atob(String(value||'').replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function encodeBase64Url(bytes){
  let raw='';
  for(const b of bytes)raw+=String.fromCharCode(b);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeBase64Url(value){
  const text=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  return decodeBase64(text+'='.repeat((4-text.length%4)%4));
}
async function sosDataKey(env){
  const bytes=decodeBase64(String(env?.MAISON_SOS_DATA_KEY_B64||''));
  if(bytes.length!==32)throw new Error('sos_data_key_invalid');
  return await crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}

export async function encryptSosSecret(env,plaintext,{aad}={}){
  const value=String(plaintext||'');
  if(!value)throw new Error('sos_secret_empty');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const params={name:'AES-GCM',iv};
  if(aad)params.additionalData=new TextEncoder().encode(String(aad));
  const encrypted=await crypto.subtle.encrypt(params,await sosDataKey(env),new TextEncoder().encode(value));
  return {
    version:'aes-gcm-v1',
    iv:encodeBase64Url(iv),
    ciphertext:encodeBase64Url(new Uint8Array(encrypted))
  };
}

export async function decryptSosSecret(env,record,{aad}={}){
  if(record?.version!=='aes-gcm-v1')throw new Error('unsupported_sos_crypto_version');
  const params={name:'AES-GCM',iv:decodeBase64Url(record.iv)};
  if(aad)params.additionalData=new TextEncoder().encode(String(aad));
  const clear=await crypto.subtle.decrypt(
    params,await sosDataKey(env),decodeBase64Url(record.ciphertext)
  );
  return new TextDecoder().decode(clear);
}
