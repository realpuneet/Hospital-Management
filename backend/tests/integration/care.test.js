import { boot, shutdown, reset, app, makeUser, makeDoctor, makeMedicine, login, authed, futureDate } from './helpers.js';
import { Medicine, Medication, NotificationLog } from '../../src/models/index.js';

let a;
beforeAll(async () => { await boot(); a = app(); });
afterAll(shutdown);
beforeEach(reset);

async function consultation() {
  const { profile, user: docUser } = await makeDoctor({ fee: 0, videoFee: 0 });
  const patient = await makeUser('patient', { prefs: { whatsappNumber: '919999999999' }, addresses: [{ line1: '1 Road', city: 'Delhi', pincode: '110001', isDefault: true }] });
  const p = authed(a, await login(a, patient));
  const d = authed(a, await login(a, docUser));
  const book = await p.post('/api/v1/appointments', { doctorId: String(profile._id), date: futureDate(2), time: '10:00', mode: 'video', notify: { email: true, whatsapp: true } });
  return { p, d, patient, appt: book.body.data.appointment };
}

describe('optional email + WhatsApp confirmation', () => {
  test('both channels are queued/logged only when the patient opted in for the booking', async () => {
    const { appt } = await consultation();
    const logs = await NotificationLog.find({ 'ref.id': appt.id });
    expect(logs.map((l) => l.channel).sort()).toEqual(['email', 'whatsapp']);
    expect(logs.every((l) => l.status === 'dry_run')).toBe(true);
  });
  test('no channels when the patient opts out', async () => {
    const { profile } = await makeDoctor({ fee: 0 });
    const patient = await makeUser('patient');
    const p = authed(a, await login(a, patient));
    const r = await p.post('/api/v1/appointments', { doctorId: String(profile._id), date: futureDate(2), time: '10:00', mode: 'in_person', notify: { email: false, whatsapp: false } });
    expect(r.status).toBe(201);
    expect(await NotificationLog.countDocuments({})).toBe(0);
  });
});

describe('consultation -> prescription -> medication -> pharmacy', () => {
  test('doctor completes the visit and writes a prescription that creates a medication plan', async () => {
    const { p, d, appt } = await consultation();
    expect((await d.patch(`/api/v1/doctor/appointments/${appt.id}/status`, { status: 'in_consultation' })).status).toBe(200);
    const rx = await d.put(`/api/v1/doctor/appointments/${appt.id}/prescription`, { diagnosis: 'Viral fever', items: [{ name: 'Paracetamol 500', dosage: '1-0-1', durationDays: 3 }] });
    expect(rx.status).toBe(200);
    expect((await d.patch(`/api/v1/doctor/appointments/${appt.id}/status`, { status: 'completed' })).status).toBe(200);

    const mine = await p.get('/api/v1/prescriptions');
    expect(mine.body.data).toHaveLength(1);
    const today = await p.get('/api/v1/prescriptions/medications/today');
    expect(today.body.data.doses.map((x) => x.time)).toEqual(['08:00', '21:00']);
    const dose = today.body.data.doses[0];
    const marked = await p.post(`/api/v1/prescriptions/medications/${dose.medicationId}/dose`, { key: dose.key });
    expect(marked.body.data.summary.taken).toBe(1);
    expect(await Medication.countDocuments({ isActive: true })).toBe(1);
  });

  test('invalid status jumps are rejected', async () => {
    const { d, appt } = await consultation();
    const r = await d.patch(`/api/v1/doctor/appointments/${appt.id}/status`, { status: 'completed' });
    expect(r.status).toBe(409);
  });

  test('Rx-only medicines need a covering prescription; stock never goes negative', async () => {
    const { p, d, appt } = await consultation();
    const antibiotic = await makeMedicine({ name: 'Amoxicillin', requiresPrescription: true, stock: 3 });
    const body = { items: [{ medicineId: String(antibiotic._id), qty: 1 }], addressId: (await p.get('/api/v1/auth/me')).body.data.addresses[0]._id, payMethod: 'cod' };

    expect((await p.post('/api/v1/orders', body)).status).toBe(400); // no prescription

    await d.patch(`/api/v1/doctor/appointments/${appt.id}/status`, { status: 'in_consultation' });
    const rx = await d.put(`/api/v1/doctor/appointments/${appt.id}/prescription`, { items: [{ name: 'Amoxicillin', medicine: String(antibiotic._id), dosage: '1-0-1' }] });
    const ok = await p.post('/api/v1/orders', { ...body, prescriptionId: rx.body.data.id });
    expect(ok.status).toBe(201);
    expect((await Medicine.findById(antibiotic._id)).stock).toBe(2);

    const tooMany = await p.post('/api/v1/orders', { ...body, items: [{ medicineId: String(antibiotic._id), qty: 5 }], prescriptionId: rx.body.data.id });
    expect(tooMany.status).toBe(409);
    expect((await Medicine.findById(antibiotic._id)).stock).toBe(2);
  });

  test('order lifecycle with rider hand-over OTP and stock restore on cancel', async () => {
    const { p, patient } = await consultation();
    const med = await makeMedicine({ price: 100, stock: 5 });
    const pharmacist = authed(a, await login(a, await makeUser('pharmacist')));
    const riderUser = await makeUser('rider', { rider: { online: true } });
    const rider = authed(a, await login(a, riderUser));
    const addr = (await p.get('/api/v1/auth/me')).body.data.addresses[0]._id;

    const placed = await p.post('/api/v1/orders', { items: [{ medicineId: String(med._id), qty: 2 }], addressId: addr, payMethod: 'cod' });
    const id = placed.body.data.order.id;
    expect(placed.body.data.order.status).toBe('placed');
    expect((await pharmacist.patch(`/api/v1/pharmacy/orders/${id}/status`, { status: 'confirmed' })).status).toBe(200);
    expect((await pharmacist.patch(`/api/v1/pharmacy/orders/${id}/status`, { status: 'packed' })).status).toBe(200); // auto-assigns online rider
    expect((await rider.post(`/api/v1/rider/orders/${id}/action`, { action: 'pickup' })).status).toBe(200);

    const detail = await p.get(`/api/v1/orders/${id}`);
    const otp = detail.body.data.deliveryOtp;
    expect(otp).toMatch(/^\d{4}$/);
    const wrong = await rider.post(`/api/v1/rider/orders/${id}/action`, { action: 'deliver', otp: otp === '0000' ? '1111' : '0000' });
    expect(wrong.status).toBe(400);
    expect((await rider.post(`/api/v1/rider/orders/${id}/action`, { action: 'deliver', otp })).status).toBe(200);
    expect((await p.get(`/api/v1/orders/${id}`)).body.data.status).toBe('delivered');

    // second order cancelled -> stock restored
    const o2 = await p.post('/api/v1/orders', { items: [{ medicineId: String(med._id), qty: 1 }], addressId: addr, payMethod: 'cod' });
    const before = (await Medicine.findById(med._id)).stock;
    await p.post(`/api/v1/orders/${o2.body.data.order.id}/cancel`, { reason: 'changed mind' });
    expect((await Medicine.findById(med._id)).stock).toBe(before + 1);
    expect(patient).toBeTruthy();
  });
});
