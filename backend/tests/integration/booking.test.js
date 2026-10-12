import request from 'supertest';
import { boot, shutdown, reset, app, makeUser, makeDoctor, login, authed, futureDate } from './helpers.js';
import { Appointment, Payment } from '../../src/models/index.js';

let a;
beforeAll(async () => { await boot(); a = app(); });
afterAll(shutdown);
beforeEach(reset);

async function setup() {
  const { profile, user: docUser } = await makeDoctor();
  const patient = await makeUser('patient', { prefs: { whatsappNumber: '919999999999' } });
  const token = await login(a, patient);
  return { profile, docUser, patient, api: authed(a, token) };
}
const payload = (profile, extra = {}) => ({ doctorId: String(profile._id), date: futureDate(2), time: '10:00', mode: 'in_person', ...extra });

describe('appointment booking', () => {
  test('lists slots and marks a booked slot unavailable', async () => {
    const { profile, api } = await setup();
    const res = await api.post('/api/v1/appointments', payload(profile, { payMode: 'at_clinic' }));
    expect(res.status).toBe(201);
    expect(res.body.data.appointment.status).toBe('booked');
    const slots = await request(a).get(`/api/v1/doctors/${profile._id}/slots?date=${futureDate(2)}&mode=in_person`);
    const ten = slots.body.data.slots.find((s) => s.time === '10:00');
    expect(ten.available).toBe(false);
  });

  test('online payment holds the slot, then confirms after verification (dry-run)', async () => {
    const { profile, api } = await setup();
    const res = await api.post('/api/v1/appointments', payload(profile));
    expect(res.body.data.appointment.status).toBe('pending_payment');
    expect(res.body.data.payment.dryRun).toBe(true);
    const v = await api.post('/api/v1/payments/verify', { providerOrderId: res.body.data.payment.providerOrderId });
    expect(v.status).toBe(200);
    const appt = await Appointment.findById(res.body.data.appointment.id);
    expect(appt.status).toBe('booked');
    expect(appt.paymentStatus).toBe('paid');
  });

  test('two patients racing for the same slot: exactly one wins', async () => {
    const { profile, api } = await setup();
    const other = await makeUser('patient');
    const api2 = authed(a, await login(a, other));
    const body = payload(profile, { payMode: 'at_clinic' });
    const [r1, r2] = await Promise.all([api.post('/api/v1/appointments', body), api2.post('/api/v1/appointments', body)]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect(await Appointment.countDocuments({ doctor: profile._id, slotLocked: true })).toBe(1);
  });

  test('reschedule moves the slot atomically and frees the old one', async () => {
    const { profile, api } = await setup();
    const b = await api.post('/api/v1/appointments', payload(profile, { payMode: 'at_clinic' }));
    const id = b.body.data.appointment.id;
    const r = await api.post(`/api/v1/appointments/${id}/reschedule`, { date: futureDate(3), time: '11:30' });
    expect(r.status).toBe(200);
    expect(r.body.data.rescheduleCount).toBe(1);
    // the old slot can be booked by somebody else now
    const other = authed(a, await login(a, await makeUser('patient')));
    const again = await other.post('/api/v1/appointments', payload(profile, { payMode: 'at_clinic' }));
    expect(again.status).toBe(201);
  });

  test('reschedule limit is enforced for patients', async () => {
    const { profile, api } = await setup();
    const b = await api.post('/api/v1/appointments', payload(profile, { payMode: 'at_clinic' }));
    const id = b.body.data.appointment.id;
    expect((await api.post(`/api/v1/appointments/${id}/reschedule`, { date: futureDate(3), time: '09:00' })).status).toBe(200);
    expect((await api.post(`/api/v1/appointments/${id}/reschedule`, { date: futureDate(3), time: '09:30' })).status).toBe(200);
    expect((await api.post(`/api/v1/appointments/${id}/reschedule`, { date: futureDate(3), time: '10:00' })).status).toBe(409);
  });

  test('cancelling a paid appointment far in advance refunds the payment', async () => {
    const { profile, api } = await setup();
    const b = await api.post('/api/v1/appointments', payload(profile));
    await api.post('/api/v1/payments/verify', { providerOrderId: b.body.data.payment.providerOrderId });
    const c = await api.post(`/api/v1/appointments/${b.body.data.appointment.id}/cancel`, { reason: 'plans changed' });
    expect(c.status).toBe(200);
    expect(c.body.data.refunded).toBe(500);
    expect((await Payment.findOne({})).status).toBe('refunded');
  });

  test('booking is idempotent with Idempotency-Key', async () => {
    const { profile } = await setup();
    const p = await makeUser('patient');
    const token = await login(a, p);
    const send = () => request(a).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', 'abc-123').send(payload(profile, { payMode: 'at_clinic' }));
    const r1 = await send();
    const r2 = await send();
    expect(r1.status).toBe(201);
    expect(r2.headers['idempotent-replay']).toBe('true');
    expect(await Appointment.countDocuments({ patient: p._id })).toBe(1);
  });

  test('rejects booking a time outside the doctor\'s hours', async () => {
    const { profile, api } = await setup();
    const res = await api.post('/api/v1/appointments', payload(profile, { time: '22:00', payMode: 'at_clinic' }));
    expect(res.status).toBe(400);
  });
});
