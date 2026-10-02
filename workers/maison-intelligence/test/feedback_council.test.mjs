import test from 'node:test';
import assert from 'node:assert/strict';
import { FEEDBACK_PERSONAS, councilAssignmentsForDate } from '../src/feedback_council.js';

test('feedback council has the full synthetic advisory board',()=>{
  assert.equal(FEEDBACK_PERSONAS.length,19);
  assert.ok(FEEDBACK_PERSONAS.some(x=>x.id==='conversion_critic'));
  assert.ok(FEEDBACK_PERSONAS.some(x=>x.id==='christian_dior_imagined'));
  assert.ok(FEEDBACK_PERSONAS.some(x=>x.id==='luxury_contemporary_founder'));
});

test('two reviews every three hours rotate across sixteen distinct personas per day',()=>{
  const seen=new Set();
  const pages=new Set();
  for(let hour=0;hour<24;hour+=3){
    const rows=councilAssignmentsForDate(new Date(`2026-10-02T${String(hour).padStart(2,'0')}:00:00Z`),2);
    assert.equal(rows.length,2);
    for(const row of rows){
      seen.add(row.persona.id);
      pages.add(row.page[0]);
    }
  }
  assert.equal(seen.size,16);
  assert.ok(pages.size>=4);
});

test('per-run review count is bounded',()=>{
  const rows=councilAssignmentsForDate(new Date('2026-10-02T12:00:00Z'),99);
  assert.equal(rows.length,4);
});
