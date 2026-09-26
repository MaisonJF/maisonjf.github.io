import fs from 'node:fs';
import assert from 'node:assert/strict';
import { runSosScheduler } from '../../../workers/sos-runtime/src/index.js';

const root=new URL('../../../',import.meta.url);
const contract=JSON.parse(fs.readFileSync(new URL('.github/maison-product/sos/scheduler-contract.json',root),'utf8'));
const source=fs.readFileSync(new URL('workers/sos-runtime/src/index.js',root),'utf8');
const template=fs.readFileSync(new URL('workers/sos-runtime/wrangler.example.jsonc',root),'utf8');

assert.equal(contract.public_fetch_handler,false);
assert.equal(contract.default_enabled,false);
assert.equal(contract.rules.reminder_before_trusted_notice,true);
assert.equal(contract.rules.permanent_reminder_failure_blocks_escalation,true);
assert.equal(source.includes('fetch(request'),false);
assert.equal(source.includes('MAISON_BRAIN_DB'),false);
assert.equal(source.includes('STRIPE'),false);
assert.ok(template.includes('"MAISON_SOS_SCHEDULER_ENABLED": "false"'));
assert.ok(template.includes('"binding": "MAISON_SOS_DB"'));

const disabled=await runSosScheduler({MAISON_SOS_SCHEDULER_ENABLED:'false'});
assert.deepEqual(disabled,{
  enabled:false,queued:{userReminders:0,trustedNotices:0},processed:0,sent:0,retried:0,failed:0
});

console.log('SOS scheduler contract: OK');
