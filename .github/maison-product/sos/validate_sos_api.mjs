import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  requireSosApiEnabled,requireSameOrigin,readSosJson,requireIdempotencyKey
} from '../../../functions/_lib/sos-api.js';
import { sosEmailCopy } from '../../../functions/_lib/sos-brevo.js';

const root=new URL('../../../',import.meta.url);
const contract=JSON.parse(fs.readFileSync(new URL('.github/maison-product/sos/api-contract.json',root),'utf8'));
assert.equal(contract.kill_switch,'MAISON_SOS_API_ENABLED');
assert.equal(contract.invariants.setup_never_returns_invite_token,true);
assert.equal(contract.invariants.no_brain_access,true);

assert.throws(()=>requireSosApiEnabled({}),/sos_api_disabled/);
assert.doesNotThrow(()=>requireSosApiEnabled({MAISON_SOS_API_ENABLED:'true'}));

const same=new Request('https://maison-jf.com/api/sos/checkin',{
  method:'POST',headers:{Origin:'https://maison-jf.com','Idempotency-Key':'abcdefgh'}
});
assert.doesNotThrow(()=>requireSameOrigin(same));
assert.equal(requireIdempotencyKey(same),'abcdefgh');

const cross=new Request('https://maison-jf.com/api/sos/checkin',{
  method:'POST',headers:{Origin:'https://evil.example'}
});
assert.throws(()=>requireSameOrigin(cross),/sos_origin_forbidden/);

const parsed=await readSosJson(new Request('https://maison-jf.com/api/sos/setup',{
  method:'POST',headers:{'content-type':'application/json'},body:'{"timezone":"Europe/Lisbon"}'
}));
assert.equal(parsed.timezone,'Europe/Lisbon');

const routePaths=[
  'functions/api/sos/setup.js',
  'functions/api/sos/status.js',
  'functions/api/sos/checkin.js',
  'functions/api/sos/pause.js',
  'functions/api/sos/resume.js',
  'functions/api/sos/delete.js',
  'functions/api/sos/contact/accept.js'
];
for(const path of routePaths){
  const source=fs.readFileSync(new URL(path,root),'utf8');
  assert.ok(source.includes('requireSosApiEnabled'),path+' must be fail-closed');
  assert.equal(source.includes('MAISON_BRAIN_DB'),false,path+' must not access Brain DB');
  assert.equal(source.includes('STRIPE'),false,path+' must not access Stripe');
  assert.equal(source.includes('console.log'),false,path+' must not log');
}
const setup=fs.readFileSync(new URL('functions/api/sos/setup.js',root),'utf8');
assert.ok(setup.includes('inviteToken:invite.token'),'setup must send token server-side');
assert.ok(setup.indexOf('MAISON_SOS_BREVO_ENABLED') < setup.indexOf('configureSosAccount'),'setup must fail before operational writes when delivery is disabled');
assert.ok(setup.includes("status:'contact_pending'"));
assert.equal(setup.includes('token:invite.token'),false,'setup response must never expose invite token');

const env={MAISON_SOS_PUBLIC_URL:'https://maison-jf.com'};
const invite=sosEmailCopy('trusted_invite',{env,inviteToken:'x'.repeat(40),expiresAt:'2026-09-27T10:00:00Z'});
assert.match(invite.text,/\/sos\/aceitar#token=/);
assert.doesNotMatch(invite.text,/\/sos\/aceitar\?token=/);

const page=fs.readFileSync(new URL('sos/aceitar/app.js',root),'utf8');
const html=fs.readFileSync(new URL('sos/aceitar/index.html',root),'utf8');
assert.ok(page.includes('location.hash'));
assert.ok(page.includes("history.replaceState(null,'',location.pathname)"));
assert.equal(page.includes('location.search'),false);
assert.ok(page.includes("decision==='accept'"));
assert.ok(page.includes("decide('decline')"));
assert.equal(html.includes('analytics.js'),false);
assert.match(html,/noindex,nofollow/);

console.log('SOS API + trusted-contact consent surface: OK');
