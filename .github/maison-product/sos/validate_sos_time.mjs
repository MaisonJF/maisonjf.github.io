import assert from 'node:assert/strict';
import {
  validateSosLocalTime,nextSosDueAt,sosLocalDateTime
} from '../../../functions/_lib/sos-time.js';

assert.equal(validateSosLocalTime('20:00'),'20:00');
assert.throws(()=>validateSosLocalTime('24:00'),/invalid_sos_local_time/);
assert.throws(()=>validateSosLocalTime('8:00'),/invalid_sos_local_time/);

const ordinary=nextSosDueAt({
  afterIso:'2026-09-25T12:00:00.000Z',
  timeZone:'Europe/Lisbon',
  localTime:'20:00'
});
assert.deepEqual(sosLocalDateTime(ordinary,'Europe/Lisbon'),{
  date:'2026-09-26',time:'20:00'
});

// Europe/Lisbon moves into summer time on this weekend.
// The UTC hour changes, while the human-facing local hour must stay 20:00.
const spring=nextSosDueAt({
  afterIso:'2026-03-28T20:30:00.000Z',
  timeZone:'Europe/Lisbon',
  localTime:'20:00'
});
assert.deepEqual(sosLocalDateTime(spring,'Europe/Lisbon'),{
  date:'2026-03-29',time:'20:00'
});
assert.equal(spring,'2026-03-29T19:00:00.000Z');

// And it moves back in autumn without shifting the human schedule.
const autumn=nextSosDueAt({
  afterIso:'2026-10-24T20:30:00.000Z',
  timeZone:'Europe/Lisbon',
  localTime:'20:00'
});
assert.deepEqual(sosLocalDateTime(autumn,'Europe/Lisbon'),{
  date:'2026-10-25',time:'20:00'
});
assert.equal(autumn,'2026-10-25T20:00:00.000Z');

console.log('SOS local wall-clock + DST scheduling: OK');
