import test from 'node:test';
import assert from 'node:assert/strict';
import { modeFor, selectSignal, runEditorialGrowth } from '../src/index.js';

test('growth cadence alternates editorial and Foundry every six hours',()=>{
  assert.equal(modeFor(new Date('2026-10-02T00:00:00Z')),'editorial');
  assert.equal(modeFor(new Date('2026-10-02T06:00:00Z')),'foundry');
  assert.equal(modeFor(new Date('2026-10-02T12:00:00Z')),'editorial');
  assert.equal(modeFor(new Date('2026-10-02T18:00:00Z')),'foundry');
});

test('editorial selection rotates within strongest recent Oceans',()=>{
  const rows=Array.from({length:12},(_,i)=>({
    ocean_key:'ocean-'+i,
    relevance_score:100-i,
    commercial_score:80-i
  }));
  const a=selectSignal(rows,new Date('2026-10-02T00:00:00Z'));
  const b=selectSignal(rows,new Date('2026-10-02T12:00:00Z'));
  assert.ok(a?.ocean_key);
  assert.ok(b?.ocean_key);
  assert.notEqual(a.ocean_key,b.ocean_key);
});

test('growth fails closed when disabled or bindings are absent',async()=>{
  assert.deepEqual(await runEditorialGrowth({EDITORIAL_GROWTH_ENABLED:'false'}),{skipped:'editorial_growth_disabled'});
  assert.deepEqual(await runEditorialGrowth({EDITORIAL_GROWTH_ENABLED:'true'}),{skipped:'growth_db_missing'});
  assert.deepEqual(await runEditorialGrowth({EDITORIAL_GROWTH_ENABLED:'true',GROWTH_DB:{}}),{skipped:'workers_ai_unavailable'});
});
