import fs from 'node:fs';
import assert from 'node:assert/strict';
import { requireVerifiedSosIdentity, sosAccountRef } from '../../../functions/_lib/sos-auth.js';
import { encryptSosSecret, decryptSosSecret } from '../../../functions/_lib/sos-crypto.js';

const root=new URL('../../../',import.meta.url);
const contract=JSON.parse(fs.readFileSync(new URL('.github/maison-product/sos/runtime-contract.json',root),'utf8'));
const runtime=fs.readFileSync(new URL('functions/_lib/sos-runtime.js',root),'utf8');

assert.equal(contract.binding,'MAISON_SOS_DB');
assert.equal(contract.isolation.separate_from_maison_brain_db,true);
assert.equal(contract.routing.public_api_routes_created,true);
assert.equal(contract.routing.fail_closed,true);
assert.equal(contract.routing.api_gate,'MAISON_SOS_API_ENABLED');
assert.equal(contract.routing.auth_gate,'MAISON_SOS_AUTH_ENABLED');
assert.equal(contract.auth_boundary.provider,'supabase_auth');
assert.equal(contract.auth_boundary.raw_identity_persisted,false);
assert.equal(contract.external_effects.notification_provider,'resend');
assert.equal(contract.external_effects.public_product_activation_authorized,false);
assert.equal(contract.external_effects.notification_delivery_enabled,false);
assert.equal(runtime.includes('MAISON_BRAIN_DB'),false);
assert.equal(runtime.includes('fetch('),false);
assert.equal(runtime.includes('console.log'),false);

assert.throws(()=>requireVerifiedSosIdentity({provider:'test',subject:'abc',verified:false}),/not_verified/);
const identity=requireVerifiedSosIdentity({provider:'oidc',subject:'subject-123',verified:true});
assert.equal(identity.provider,'oidc');

const env={
  MAISON_SOS_SUBJECT_PEPPER:'p'.repeat(48),
  MAISON_SOS_DATA_KEY_B64:btoa(String.fromCharCode(...Array.from({length:32},(_,i)=>i+1)))
};
const a=await sosAccountRef(env,identity);
const b=await sosAccountRef(env,identity);
assert.equal(a,b);
assert.match(a,/^sua_[0-9a-f]{36}$/);
assert.notEqual(a,await sosAccountRef(env,{provider:'oidc',subject:'subject-456',verified:true}));

const encrypted=await encryptSosSecret(env,'contact@example.com',{aad:'acct|contact|email'});
assert.equal(encrypted.version,'aes-gcm-v1');
assert.notEqual(encrypted.ciphertext,'contact@example.com');
assert.equal(
  await decryptSosSecret(env,encrypted,{aad:'acct|contact|email'}),
  'contact@example.com'
);
await assert.rejects(
  decryptSosSecret(env,encrypted,{aad:'wrong'}),
  /operation|decrypt|data|algorithm|Error/i
);

console.log('SOS runtime contracts: OK');
