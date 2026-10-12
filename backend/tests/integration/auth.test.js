import request from 'supertest';
import { boot, shutdown, reset, app } from './helpers.js';

let a;
beforeAll(async () => { await boot(); a = app(); });
afterAll(shutdown);
beforeEach(reset);

const reg = { name: 'Asha Rao', email: 'asha@test.local', phone: '9876543210', password: 'Passw0rd1' };

test('register -> login -> me -> refresh rotation with reuse detection', async () => {
  const r = await request(a).post('/api/v1/auth/register').send(reg);
  expect(r.status).toBe(201);
  expect(r.body.data.user.passwordHash).toBeUndefined();

  const login = await request(a).post('/api/v1/auth/login').send({ identifier: reg.email, password: reg.password });
  expect(login.status).toBe(200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  const me = await request(a).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
  expect(me.body.data.email).toBe(reg.email);

  const r1 = await request(a).post('/api/v1/auth/refresh').set('Cookie', cookie);
  expect(r1.status).toBe(200);
  const reused = await request(a).post('/api/v1/auth/refresh').set('Cookie', cookie); // old token replayed
  expect(reused.status).toBe(401);
  const newCookie = r1.headers['set-cookie'][0].split(';')[0];
  const afterReuse = await request(a).post('/api/v1/auth/refresh').set('Cookie', newCookie); // family revoked
  expect(afterReuse.status).toBe(401);
});

test('duplicate registration is rejected', async () => {
  await request(a).post('/api/v1/auth/register').send(reg);
  const dup = await request(a).post('/api/v1/auth/register').send(reg);
  expect(dup.status).toBe(409);
});

test('OTP login creates a patient (dev mode OTP)', async () => {
  const req = await request(a).post('/api/v1/auth/otp/request').send({ phone: '9811122233' });
  expect(req.body.data.devOtp).toBe('123456');
  const bad = await request(a).post('/api/v1/auth/otp/verify').send({ phone: '9811122233', otp: '000000' });
  expect(bad.status).toBe(400);
  const ok = await request(a).post('/api/v1/auth/otp/verify').send({ phone: '9811122233', otp: '123456', name: 'Quick User' });
  expect(ok.status).toBe(200);
  expect(ok.body.data.user.role).toBe('patient');
});

test('role guards: patient cannot reach admin or doctor routes', async () => {
  const r = await request(a).post('/api/v1/auth/register').send(reg);
  const t = r.body.data.accessToken;
  expect((await request(a).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  expect((await request(a).get('/api/v1/doctor/appointments').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  expect((await request(a).get('/api/v1/appointments')).status).toBe(401);
});
