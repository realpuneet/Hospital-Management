import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Department } from '../models/Department.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { ApiError } from '../utils/ApiError.js';
import { APPT_STATUS, ROLES } from '../utils/constants.js';
import { cacheGetOrSet, invalidateNamespace } from '../utils/cache.js';
import { escapeRegex, normalizePhone, slugify, timeStr, toMinutes, todayStr } from '../utils/helpers.js';
import { pageMeta, pageParams } from '../utils/pagination.js';
import { cancelAppointment } from './appointment.service.js';
import { emit } from '../sockets/index.js';

const NS = 'doctors';

/* ------------------------------------ departments ------------------------------------ */
export const listDepartments = () =>
  cacheGetOrSet(NS, 'departments', 300, () => Department.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean());

export const listAllDepartments = () => Department.find().sort({ sortOrder: 1, name: 1 }).lean();

export async function createDepartment(data) {
  try {
    const d = await Department.create({ ...data, slug: slugify(data.name) });
    await invalidateNamespace(NS);
    return d;
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Department already exists');
    throw e;
  }
}
export async function updateDepartment(id, patch) {
  if (patch.name) patch.slug = slugify(patch.name);
  const d = await Department.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!d) throw ApiError.notFound('Department not found');
  await invalidateNamespace(NS);
  return d;
}
export async function deleteDepartment(id) {
  if (await DoctorProfile.exists({ department: id, isActive: true })) throw ApiError.conflict('Department still has active doctors');
  await Department.findByIdAndUpdate(id, { isActive: false });
  await invalidateNamespace(NS);
}

/* --------------------------------------- public ---------------------------------------- */
export async function listDoctors(query) {
  const { page, limit, skip } = pageParams(query, { defaultLimit: 12, maxLimit: 48 });
  const filter = { isActive: true };
  if (query.department && mongoose.isValidObjectId(query.department)) filter.department = query.department;
  if (query.mode) filter.modes = query.mode;
  const and = [];
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    and.push({ $or: [{ name: rx }, { specialization: rx }, { conditionsTreated: rx }] });
  }
  if (query.maxFee) and.push({ $or: [{ 'fees.in_person': { $lte: Number(query.maxFee) } }, { 'fees.video': { $lte: Number(query.maxFee) } }] });
  if (and.length) filter.$and = and;
  if (query.language) filter.languages = new RegExp(`^${escapeRegex(query.language)}$`, 'i');
  const sort = { rating: { 'rating.avg': -1, 'rating.count': -1 }, experience: { experienceYears: -1 }, fee: { 'fees.in_person': 1 }, name: { name: 1 } }[query.sort] || { 'rating.avg': -1, name: 1 };
  const key = JSON.stringify({ query, page, limit });
  return cacheGetOrSet(NS, key, 60, async () => {
    const [items, total] = await Promise.all([
      DoctorProfile.find(filter).sort(sort).skip(skip).limit(limit).populate('department', 'name slug').select('-leaves').lean(),
      DoctorProfile.countDocuments(filter),
    ]);
    return { items, meta: pageMeta(total, page, limit) };
  });
}

export async function getDoctor(idOrSlug) {
  const q = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const d = await DoctorProfile.findOne({ ...q, isActive: true }).populate('department', 'name slug').select('-leaves.reason').lean();
  if (!d) throw ApiError.notFound('Doctor not found');
  return d;
}
/** Internal: full profile document for slot maths. */
export async function getProfileDoc(idOrSlug) {
  const q = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const d = await DoctorProfile.findOne({ ...q, isActive: true });
  if (!d) throw ApiError.notFound('Doctor not found');
  return d;
}

/* ------------------------------------- doctor self-service ------------------------------------- */
export async function myProfile(userId) {
  const p = await DoctorProfile.findOne({ user: userId }).populate('department', 'name slug');
  if (!p) throw ApiError.notFound('Doctor profile not found');
  return p;
}

function assertSchedule(weekly = []) {
  const seen = new Set();
  for (const d of weekly) {
    if (seen.has(d.day)) throw ApiError.badRequest('Duplicate weekday in schedule');
    seen.add(d.day);
    for (const r of d.ranges) {
      if (toMinutes(r.start) >= toMinutes(r.end)) throw ApiError.badRequest(`Invalid range ${r.start}-${r.end}`);
    }
  }
}

export async function updateMySchedule(userId, { weekly, slotMinutes, modes, isAcceptingBookings, room }) {
  const p = await myProfile(userId);
  if (weekly) { assertSchedule(weekly); p.weekly = weekly; }
  if (slotMinutes) p.slotMinutes = slotMinutes;
  if (modes) p.modes = modes;
  if (typeof isAcceptingBookings === 'boolean') p.isAcceptingBookings = isAcceptingBookings;
  if (room !== undefined) p.room = room;
  await p.save();
  await invalidateNamespace(NS);
  emit(`slots:${p._id}`, 'slots:changed', { doctorId: String(p._id) });
  return p;
}

/** Add leave; returns booked appointments on that date. With force=true they are cancelled (full refund). */
export async function addLeave(actor, { date, reason, fullDay = true, ranges = [], force = false }) {
  if (date < todayStr()) throw ApiError.badRequest('Cannot add leave in the past');
  const p = await myProfile(actor._id);
  const affected = await Appointment.find({ doctor: p._id, date, status: { $in: [APPT_STATUS.BOOKED, APPT_STATUS.PENDING_PAYMENT] } }).select('_id code startAt').lean();
  const inBlocked = (a) => ranges.some((r) => toMinutes(timeStr(a.startAt)) >= toMinutes(r.start) && toMinutes(timeStr(a.startAt)) < toMinutes(r.end));
  const blocking = fullDay ? affected : affected.filter(inBlocked);
  if (blocking.length && !force) {
    return { added: false, affected: blocking.length, appointments: blocking, message: 'There are booked appointments on this date. Reschedule them or confirm cancellation.' };
  }
  p.leaves = p.leaves.filter((l) => l.date !== date);
  p.leaves.push({ date, reason, fullDay, ranges });
  await p.save();
  if (force) {
    for (const a of blocking) await cancelAppointment(actor, a._id, reason || 'Doctor unavailable').catch(() => {});
  }
  await invalidateNamespace(NS);
  emit(`slots:${p._id}`, 'slots:changed', { doctorId: String(p._id), date });
  return { added: true, affected: blocking.length, profile: p };
}

export async function removeLeave(userId, date) {
  const p = await myProfile(userId);
  p.leaves = p.leaves.filter((l) => l.date !== date);
  await p.save();
  await invalidateNamespace(NS);
  emit(`slots:${p._id}`, 'slots:changed', { doctorId: String(p._id), date });
  return p;
}

export async function updateMyProfile(userId, patch) {
  const p = await myProfile(userId);
  const allowed = ['bio', 'languages', 'qualifications', 'conditionsTreated', 'avatar'];
  for (const k of allowed) if (patch[k] !== undefined) p[k] = patch[k];
  if (patch.avatar !== undefined) await User.updateOne({ _id: userId }, { avatar: patch.avatar });
  await p.save();
  await invalidateNamespace(NS);
  return p;
}

/* ----------------------------------------- admin ----------------------------------------- */
export async function adminCreateDoctor(data) {
  const phone = data.phone ? normalizePhone(data.phone) : undefined;
  if (await User.exists({ $or: [{ email: data.email }, ...(phone ? [{ phone }] : [])] })) throw ApiError.conflict('Email or phone already registered');
  if (!(await Department.exists({ _id: data.department }))) throw ApiError.badRequest('Department not found');
  const user = await User.create({
    name: data.name, email: data.email, phone, role: ROLES.DOCTOR, avatar: data.avatar,
    passwordHash: await bcrypt.hash(data.password, 10), emailVerified: true,
  });
  const base = slugify(`dr-${data.name}`);
  const slug = (await DoctorProfile.exists({ slug: base })) ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
  const profile = await DoctorProfile.create({
    user: user._id, name: data.name, avatar: data.avatar, slug, department: data.department,
    specialization: data.specialization, qualifications: data.qualifications || [], registrationNo: data.registrationNo,
    experienceYears: data.experienceYears || 0, bio: data.bio, languages: data.languages || ['English', 'Hindi'],
    conditionsTreated: data.conditionsTreated || [], fees: data.fees || {}, modes: data.modes?.length ? data.modes : ['in_person'],
    slotMinutes: data.slotMinutes || 15, room: data.room, weekly: data.weekly || [],
  });
  await invalidateNamespace(NS);
  return profile;
}

export async function adminUpdateDoctor(id, patch) {
  const p = await DoctorProfile.findById(id);
  if (!p) throw ApiError.notFound('Doctor not found');
  if (patch.weekly) assertSchedule(patch.weekly);
  const { name, avatar, isActive, ...rest } = patch;
  Object.assign(p, rest);
  if (name) { p.name = name; await User.updateOne({ _id: p.user }, { name }); }
  if (avatar !== undefined) { p.avatar = avatar; await User.updateOne({ _id: p.user }, { avatar }); }
  if (typeof isActive === 'boolean') { p.isActive = isActive; await User.updateOne({ _id: p.user }, { isActive }); }
  await p.save();
  await invalidateNamespace(NS);
  return p;
}

export async function adminListDoctors(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.q) filter.name = new RegExp(escapeRegex(query.q), 'i');
  if (query.department && mongoose.isValidObjectId(query.department)) filter.department = query.department;
  const [items, total] = await Promise.all([
    DoctorProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('department', 'name').populate('user', 'email phone isActive').lean(),
    DoctorProfile.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

