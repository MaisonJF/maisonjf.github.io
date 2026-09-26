import fs from 'node:fs';
import assert from 'node:assert/strict';
import { authenticateSosRequest } from '../../../functions/_lib/sos-supabase-auth.js';
import { sosEmailCopy, sendSosResendEmail } from '../../../functions/_lib/sos-resend.js';

const request=new Request('https://maison-jf.com/api/sos/test',{
  headers:{Authorization:'Bearer '+('x'.repeat(40))}
});
const authEnv={
  MAISON_SOS_AUTH_ENABLED:'true',
  MAISON_SOS_SUPABASE_URL:'https://example.supabase.co',
  MAISON_SOS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'x'.repeat(30)
};
let authCall;
const auth=await authenticateSosRequest({
  request,env:authEnv,
  fetchImpl:async (url,init)=>{
    authCall={url,init};
    return new Response(JSON.stringify({
      id:'00000000-0000-4000-8000-000000000001',
      email:'PERSON@EXAMPLE.COM',
      email_confirmed_at:'2026-09-25T10:00:00Z',
      phone:'+351900000000',
      user_metadata:{private:'must-not-leak'}
    }),{status:200,headers:{'content-type':'application/json'}});
  }
});
assert.equal(auth.identity.provider,'supabase');
assert.equal(auth.identity.verified,true);
assert.equal(auth.reminder.value,'person@example.com');
assert.equal(authCall.init.headers.apikey,authEnv.MAISON_SOS_SUPABASE_PUBLISHABLE_KEY);
assert.equal(authCall.init.headers.authorization,'Bearer '+('x'.repeat(40)));
assert.deepEqual(Object.keys(auth).sort(),['identity','reminder']);
assert.ok(authCall.url.endsWith('/auth/v1/user'));
assert.ok(!JSON.stringify(auth).includes('+351'));
assert.ok(!JSON.stringify(auth).includes('must-not-leak'));

await assert.rejects(
  authenticateSosRequest({
    request,env:authEnv,
    fetchImpl:async ()=>new Response('{}',{status:401})
  }),
  /sos_auth_unauthorized/
);
for(const [status,expected] of [[403,'sos_auth_upstream_403'],[404,'sos_auth_upstream_404'],[429,'sos_auth_upstream_429'],[503,'sos_auth_upstream_5xx']]){
  await assert.rejects(
    authenticateSosRequest({
      request,env:authEnv,
      fetchImpl:async ()=>new Response('{}',{status})
    }),
    new RegExp(expected)
  );
}

const env={
  MAISON_SOS_RESEND_ENABLED:'true',
  MAISON_SOS_RESEND_API_KEY:'re_'+'x'.repeat(40),
  MAISON_SOS_RESEND_SENDER_EMAIL:'sos@maison-jf.com',
  MAISON_SOS_PUBLIC_URL:'https://maison-jf.com'
};
const notice=sosEmailCopy('trusted_notice',{env});
assert.match(notice.text,/não foi confirmado/i);
assert.match(notice.text,/não significa necessariamente/i);
assert.doesNotMatch(notice.text,/desaparecid|inconsciente|socorro garantido|em perigo/i);

let mailCall;
const receipt=await sendSosResendEmail({
  env,to:'contact@example.com',kind:'trusted_notice',
  fetchImpl:async (url,init)=>{
    mailCall={url,init};
    return new Response(JSON.stringify({id:'msg-123'}),{status:201,headers:{'content-type':'application/json'}});
  }
});
assert.equal(receipt.messageId,'msg-123');
assert.equal(mailCall.url,'https://api.resend.com/emails');
const sent=JSON.parse(mailCall.init.body);
assert.deepEqual(sent.to,['contact@example.com']);
assert.equal(sent.from,'SOS Maison JF <sos@maison-jf.com>');
assert.equal(JSON.stringify(sent).includes('re_'),false);

for(const path of ['functions/_lib/sos-supabase-auth.js','functions/_lib/sos-resend.js','functions/_lib/sos-delivery.js']){
  const source=fs.readFileSync(new URL(path,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(source.includes('console.log'),false,path+' must not log');
}

const root=new URL('../../../',import.meta.url);
const adapters=JSON.parse(fs.readFileSync(new URL('.github/maison-product/sos/adapters-contract.json',root),'utf8'));
assert.equal(adapters.notification.provider,'resend');
assert.equal(adapters.activation.public_routes_created,true);
assert.equal(adapters.activation.public_routes_fail_closed,true);
assert.equal(adapters.activation.public_product_activation_authorized,false);
for(const path of [
  '.github/maison-product/sos/PROVISIONING.md',
  'workers/sos-runtime/wrangler.example.jsonc',
  'functions/_lib/sos-api.js'
]){
  const source=fs.readFileSync(new URL(path,root),'utf8');
  assert.equal(/BREVO|sos_brevo/i.test(source),false,path+' must not retain stale Brevo configuration');
}

console.log('SOS provider adapters: OK');
