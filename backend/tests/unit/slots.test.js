import test from 'node:test';
import assert from 'node:assert/strict';
import { workingRanges } from '../../src/utils/slots.js';

const profile = {
  modes: ['in_person', 'video'],
  weekly: [
    { day: 1, ranges: [{ start: '09:00', end: '13:00' }, { start: '17:00', end: '20:00' }] },
    { day: 2, ranges: [{ start: '10:00', end: '12:00' }], modes: ['video'] },
  ],
  leaves: [
    { date: '2026-10-19', fullDay: true },
    { date: '2026-10-26', fullDay: false, ranges: [{ start: '10:00', end: '11:00' }] },
  ],
};

test('returns the weekly template for a working day', () => {
  assert.equal(workingRanges(profile, '2026-10-12', 'in_person').length, 2); // Monday
});
test('no ranges on non-working weekday', () => {
  assert.deepEqual(workingRanges(profile, '2026-10-11', 'in_person'), []); // Sunday
});
test('day-level mode restriction is honoured', () => {
  assert.deepEqual(workingRanges(profile, '2026-10-13', 'in_person'), []); // Tuesday is video only
  assert.equal(workingRanges(profile, '2026-10-13', 'video').length, 1);
});
test('full-day leave removes everything', () => {
  assert.deepEqual(workingRanges(profile, '2026-10-19', 'in_person'), []);
});
test('partial leave splits the working range', () => {
  const r = workingRanges(profile, '2026-10-26', 'in_person');
  assert.deepEqual(r, [{ start: '09:00', end: '10:00' }, { start: '11:00', end: '13:00' }, { start: '17:00', end: '20:00' }]);
});
test('mode the doctor does not offer yields nothing', () => {
  assert.deepEqual(workingRanges({ ...profile, modes: ['in_person'] }, '2026-10-12', 'video'), []);
});
