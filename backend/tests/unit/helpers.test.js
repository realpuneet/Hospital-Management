import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateStr, generateSlots, istToDate, normalizePhone, timeStr, weekdayOf, isValidDateStr, haversineKm } from '../../src/utils/helpers.js';

test('IST conversion is exact and round-trips', () => {
  const d = istToDate('2026-10-10', '10:30');
  assert.equal(d.toISOString(), '2026-10-10T05:00:00.000Z');
  assert.equal(dateStr(d), '2026-10-10');
  assert.equal(timeStr(d), '10:30');
});

test('dateStr rolls over midnight IST correctly', () => {
  // 20:00 UTC on the 9th is 01:30 IST on the 10th
  assert.equal(dateStr(new Date('2026-10-09T20:00:00Z')), '2026-10-10');
  assert.equal(dateStr(new Date('2026-10-09T18:29:59Z')), '2026-10-09');
});

test('addDays handles month / year / leap boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('weekdayOf (0=Sun)', () => {
  assert.equal(weekdayOf('2026-10-09'), 5); // Friday
  assert.equal(weekdayOf('2026-10-11'), 0); // Sunday
});

test('isValidDateStr rejects impossible dates', () => {
  assert.equal(isValidDateStr('2026-02-30'), false);
  assert.equal(isValidDateStr('2026-13-01'), false);
  assert.equal(isValidDateStr('2026-10-09'), true);
});

test('generateSlots merges overlapping ranges and never duplicates', () => {
  const slots = generateSlots('2026-10-10', [{ start: '09:30', end: '11:00' }, { start: '09:00', end: '10:00' }], 30);
  assert.deepEqual(slots.map((s) => s.time), ['09:00', '09:30', '10:00', '10:30']);
  assert.equal(slots[0].endAt.getTime() - slots[0].startAt.getTime(), 30 * 60_000);
});

test('generateSlots drops a trailing partial slot', () => {
  const slots = generateSlots('2026-10-10', [{ start: '09:00', end: '09:50' }], 20);
  assert.deepEqual(slots.map((s) => s.time), ['09:00', '09:20']);
});

test('generateSlots with no ranges is empty', () => {
  assert.deepEqual(generateSlots('2026-10-10', [], 15), []);
});

test('normalizePhone', () => {
  assert.equal(normalizePhone('9876543210'), '919876543210');
  assert.equal(normalizePhone('+91 98765-43210'), '919876543210');
  assert.equal(normalizePhone('09876543210'), '919876543210');
  assert.equal(normalizePhone('123'), null);
});

test('haversine distance Delhi->Gurgaon is roughly 25-35 km', () => {
  const km = haversineKm({ lat: 28.6139, lng: 77.209 }, { lat: 28.4595, lng: 77.0266 });
  assert.ok(km > 20 && km < 35, String(km));
});
