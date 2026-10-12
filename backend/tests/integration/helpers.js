import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import RedisMock from 'ioredis-mock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { setRedis } from '../../src/config/redis.js';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import { User, Department, DoctorProfile, Medicine } from '../../src/models/index.js';
import { addDays, todayStr } from '../../src/utils/helpers.js';

let mongod;
export const app = () => createApp();

export async function boot() {
  mongod = await MongoMemoryServer.create();
  setRedis(new RedisMock());
  await connectDB(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
export async function shutdown() {
  await disconnectDB();
  await mongod?.stop();
}
export async function reset() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  setRedis(new RedisMock());
}

export const futureDate = (days = 2) => addDays(todayStr(), days);

export async function makeUser(role = 'patient', extra = {}) {
  const n = Math.random().toString(36).slice(2, 8);
  return User.create({ name: `${role} ${n}`, email: `${role}.${n}@t.local`, phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`, role, passwordHash: await bcrypt.hash('Passw0rd!', 4), ...extra });
}
export async function login(a, user) {
  const res = await request(a).post('/api/v1/auth/login').send({ identifier: user.email, password: 'Passw0rd!' });
  return res.body.data.accessToken;
}
export const authed = (a, token) => ({
  get: (u) => request(a).get(u).set('Authorization', `Bearer ${token}`),
  post: (u, b) => request(a).post(u).set('Authorization', `Bearer ${token}`).send(b),
  put: (u, b) => request(a).put(u).set('Authorization', `Bearer ${token}`).send(b),
  patch: (u, b) => request(a).patch(u).set('Authorization', `Bearer ${token}`).send(b),
});

/** A doctor who works 08:00-20:00 every day, 30 min slots, both modes. */
export async function makeDoctor({ fee = 500, videoFee = 300 } = {}) {
  const dept = await Department.create({ name: `Dept ${Math.random()}`, slug: `d-${Math.random().toString(36).slice(2)}` });
  const user = await makeUser('doctor');
  const profile = await DoctorProfile.create({
    user: user._id, name: user.name, slug: `dr-${Math.random().toString(36).slice(2)}`, department: dept._id,
    fees: { in_person: fee, video: videoFee }, modes: ['in_person', 'video'], slotMinutes: 30,
    weekly: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, ranges: [{ start: '08:00', end: '20:00' }] })),
  });
  return { user, profile, dept };
}
export const makeMedicine = (o = {}) =>
  Medicine.create({ name: 'Med', slug: `m-${Math.random().toString(36).slice(2)}`, mrp: 100, price: 80, stock: 10, ...o });
