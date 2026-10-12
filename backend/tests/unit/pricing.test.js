import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals } from '../../src/utils/pricing.js';
import { timesFromDosage } from '../../src/utils/dosage.js';
import { deliveryOtp } from '../../src/utils/otp.js';

const settings = { freeDeliveryAbove: 500, deliveryFee: 40, gstPercent: 12 };

test('delivery fee applies under the free-delivery threshold', () => {
  const t = computeTotals([{ price: 100, qty: 2 }], settings);
  assert.equal(t.subtotal, 200);
  assert.equal(t.deliveryFee, 40);
  assert.equal(t.total, 240);
});
test('free delivery at / above threshold', () => {
  assert.equal(computeTotals([{ price: 250, qty: 2 }], settings).deliveryFee, 0);
});
test('GST is the inclusive component of the subtotal', () => {
  assert.equal(computeTotals([{ price: 112, qty: 1 }], settings).gst, 12);
});
test('rounding is stable to 2 decimals', () => {
  const t = computeTotals([{ price: 33.33, qty: 3 }], settings);
  assert.equal(t.subtotal, 99.99);
});

test('dosage 1-0-1 => morning & night', () => assert.deepEqual(timesFromDosage('1-0-1'), ['08:00', '21:00']));
test('dosage 0-0-1 => night only', () => assert.deepEqual(timesFromDosage('0-0-1'), ['21:00']));
test('dosage 1-1-1', () => assert.deepEqual(timesFromDosage('1-1-1'), ['08:00', '14:00', '21:00']));
test('dosage 1-1-1-1 inserts an evening dose', () => assert.deepEqual(timesFromDosage('1-1-1-1'), ['08:00', '14:00', '18:00', '21:00']));
test('explicit timings override and are de-duplicated/sorted', () => assert.deepEqual(timesFromDosage('1-0-1', ['21:00', '07:30', '21:00']), ['07:30', '21:00']));
test('0-0-0 falls back to a single daily time', () => assert.deepEqual(timesFromDosage('0-0-0'), ['09:00']));

test('delivery OTP is 4 digits, deterministic, and secret/order dependent', () => {
  const a = deliveryOtp('64b000000000000000000001', 'secret-1');
  assert.match(a, /^\d{4}$/);
  assert.equal(a, deliveryOtp('64b000000000000000000001', 'secret-1'));
  const others = new Set([deliveryOtp('64b000000000000000000002', 'secret-1'), deliveryOtp('64b000000000000000000001', 'secret-2'), deliveryOtp('64b000000000000000000003', 'secret-1')]);
  assert.ok(others.size >= 2);
});
