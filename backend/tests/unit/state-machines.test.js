import test from 'node:test';
import assert from 'node:assert/strict';
import { APPT_STATUS, APPT_STATUS_LIST, APPT_TRANSITIONS, APPT_ACTIVE, ORDER_STATUS_LIST, ORDER_TRANSITIONS } from '../../src/utils/constants.js';

test('every appointment state has a transition entry and targets are valid', () => {
  for (const s of APPT_STATUS_LIST) {
    assert.ok(APPT_TRANSITIONS[s], `missing ${s}`);
    for (const t of APPT_TRANSITIONS[s]) assert.ok(APPT_STATUS_LIST.includes(t), `${s} -> ${t}`);
  }
});
test('terminal appointment states cannot move', () => {
  for (const s of [APPT_STATUS.COMPLETED, APPT_STATUS.CANCELLED, APPT_STATUS.NO_SHOW, APPT_STATUS.EXPIRED]) assert.deepEqual(APPT_TRANSITIONS[s], []);
});
test('active statuses occupy a slot and exclude terminal ones', () => {
  assert.ok(APPT_ACTIVE.includes(APPT_STATUS.BOOKED));
  assert.ok(!APPT_ACTIVE.includes(APPT_STATUS.CANCELLED));
  assert.ok(!APPT_ACTIVE.includes(APPT_STATUS.COMPLETED));
});
test('order lifecycle is forward only and terminal states are closed', () => {
  for (const s of ORDER_STATUS_LIST) {
    assert.ok(ORDER_TRANSITIONS[s], `missing ${s}`);
    for (const t of ORDER_TRANSITIONS[s]) assert.ok(ORDER_STATUS_LIST.includes(t));
  }
  assert.deepEqual(ORDER_TRANSITIONS.delivered, []);
  assert.deepEqual(ORDER_TRANSITIONS.cancelled, []);
  assert.ok(!ORDER_TRANSITIONS.delivered.includes('packed'));
});
