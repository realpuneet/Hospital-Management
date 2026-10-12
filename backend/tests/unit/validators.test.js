import test from 'node:test';
import assert from 'node:assert/strict';
import * as av from '../../src/validators/appointment.validator.js';
import * as rv from '../../src/validators/prescription.validator.js';
import * as auth from '../../src/validators/auth.validator.js';
import * as pv from '../../src/validators/pharmacy.validator.js';

const id = 'a'.repeat(24);

test('booking accepts optional email/whatsapp consent flags', () => {
  const r = av.book.safeParse({ doctorId: id, date: '2026-10-12', time: '10:30', mode: 'video', notify: { email: true, whatsapp: false } });
  assert.equal(r.success, true);
});
test('booking rejects bad time / mode', () => {
  assert.equal(av.book.safeParse({ doctorId: id, date: '2026-10-12', time: '25:00', mode: 'video' }).success, false);
  assert.equal(av.book.safeParse({ doctorId: id, date: '2026-10-12', time: '10:00', mode: 'phone' }).success, false);
});
test('prescription requires at least one medicine and a valid dosage pattern', () => {
  assert.equal(rv.upsert.safeParse({ items: [] }).success, false);
  assert.equal(rv.upsert.safeParse({ items: [{ name: 'Paracetamol', dosage: 'twice' }] }).success, false);
  const ok = rv.upsert.safeParse({ items: [{ name: 'Paracetamol', dosage: '1-1-1' }] });
  assert.equal(ok.success, true);
  assert.equal(ok.data.items[0].durationDays, 5);
});
test('register needs email or phone, and a decent password', () => {
  assert.equal(auth.register.safeParse({ name: 'Asha', password: 'abcd1234' }).success, false);
  assert.equal(auth.register.safeParse({ name: 'Asha', phone: '9876543210', password: 'abcd1234' }).success, true);
  assert.equal(auth.register.safeParse({ name: 'Asha', phone: '9876543210', password: 'short1' }).success, false);
  assert.equal(auth.register.safeParse({ name: 'Asha', email: '', phone: '9876543210', password: 'abcd1234' }).success, true);
});
test('order needs an address', () => {
  assert.equal(pv.placeOrder.safeParse({ items: [{ medicineId: id, qty: 1 }] }).success, false);
  assert.equal(pv.placeOrder.safeParse({ items: [{ medicineId: id, qty: 1 }], addressId: id }).success, true);
  assert.equal(pv.placeOrder.safeParse({ items: [{ medicineId: id, qty: 11 }], addressId: id }).success, false);
});
