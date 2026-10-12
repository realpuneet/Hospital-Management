import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex, normalizePhone } from '../utils/helpers.js';
import { pageMeta, pageParams } from '../utils/pagination.js';
import { revokeAllForUser } from './token.service.js';

export async function listUsers(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (query.isActive === 'true' || query.isActive === 'false') filter.isActive = query.isActive === 'true';
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-addresses -familyMembers').lean(),
    User.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

/** Pharmacists, riders and extra admins are created by admins (doctors via doctor.service). */
export async function createStaff({ name, email, phone, password, role }) {
  if (![ROLES.PHARMACIST, ROLES.RIDER, ROLES.ADMIN].includes(role)) throw ApiError.badRequest('Use the doctors screen to add doctors');
  const ph = phone ? normalizePhone(phone) : undefined;
  if (await User.exists({ $or: [{ email }, ...(ph ? [{ phone: ph }] : [])] })) throw ApiError.conflict('Email or phone already registered');
  return User.create({ name, email, phone: ph, role, passwordHash: await bcrypt.hash(password, 10), emailVerified: true });
}

export async function setUserActive(adminId, id, isActive) {
  if (String(adminId) === String(id)) throw ApiError.badRequest('You cannot disable your own account');
  const u = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!u) throw ApiError.notFound('User not found');
  if (!isActive) await revokeAllForUser(id);
  return u;
}

export async function listAppointments(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.date) filter.date = query.date;
  if (query.doctor) filter.doctor = query.doctor;
  if (query.q) filter.code = new RegExp(escapeRegex(query.q), 'i');
  const [items, total] = await Promise.all([
    Appointment.find(filter).sort({ startAt: -1 }).skip(skip).limit(limit)
      .populate('patient', 'name phone email').populate('doctor', 'name slug').populate('department', 'name').lean(),
    Appointment.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export async function notificationLogs(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.channel) filter.channel = query.channel;
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name').lean(),
    NotificationLog.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}
