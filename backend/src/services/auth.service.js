import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { getRedis } from '../config/redis.js';
import { randomDigits, sha256, normalizePhone } from '../utils/helpers.js';
import { ROLES } from '../utils/constants.js';
import { sendWhatsApp } from '../integrations/whatsapp.js';
import { logger } from '../utils/logger.js';
import { signAccessToken, issueRefreshToken } from './token.service.js';

const ROUNDS = 10;
export const hashPassword = (p) => bcrypt.hash(p, ROUNDS);

async function session(user, meta) {
  user.lastLoginAt = new Date();
  await user.save();
  return { user, accessToken: signAccessToken(user), refreshToken: await issueRefreshToken(user, meta) };
}

export async function register({ name, email, phone, password }, meta) {
  const ph = phone ? normalizePhone(phone) : undefined;
  if (phone && !ph) throw ApiError.badRequest('Invalid phone number');
  const clash = await User.findOne({ $or: [email ? { email } : null, ph ? { phone: ph } : null].filter(Boolean) }).lean();
  if (clash) throw ApiError.conflict('An account with this email/phone already exists', 'ACCOUNT_EXISTS');
  const user = await User.create({
    name,
    email: email || undefined,
    phone: ph,
    passwordHash: await hashPassword(password),
    role: ROLES.PATIENT,
    prefs: { whatsappNumber: ph },
  });
  return session(user, meta);
}

export async function login({ identifier, password }, meta) {
  const id = String(identifier).trim();
  const query = id.includes('@') ? { email: id.toLowerCase() } : { phone: normalizePhone(id) || '__none__' };
  const user = await User.findOne(query).select('+passwordHash');
  const ok = user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Incorrect credentials', 'BAD_CREDENTIALS');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled', 'ACCOUNT_INACTIVE');
  return session(user, meta);
}

/* ------------------------------- OTP login ------------------------------- */
const otpKey = (phone) => `otp:${phone}`;

export async function requestOtp({ phone }) {
  const ph = normalizePhone(phone);
  if (!ph) throw ApiError.badRequest('Invalid phone number');
  const r = getRedis();
  const cool = await r.set(`otp:cool:${ph}`, '1', 'EX', 30, 'NX');
  if (!cool) throw ApiError.tooMany('Please wait 30 seconds before requesting another OTP');
  const otp = env.OTP_DEV_MODE ? '123456' : randomDigits(6);
  await r.set(otpKey(ph), JSON.stringify({ h: sha256(`${ph}:${otp}`), tries: 0 }), 'EX', env.OTP_TTL_SECONDS);
  try {
    await sendWhatsApp({ to: ph, template: 'login_otp', params: [otp], text: `${otp} is your ${env.APP_NAME} login code. It expires in ${Math.round(env.OTP_TTL_SECONDS / 60)} minutes. Do not share it.` });
  } catch (e) {
    logger.warn({ err: e.message }, 'otp delivery failed');
  }
  return { sent: true, ttl: env.OTP_TTL_SECONDS, ...(env.OTP_DEV_MODE ? { devOtp: otp } : {}) };
}

export async function verifyOtp({ phone, otp, name }, meta) {
  const ph = normalizePhone(phone);
  if (!ph) throw ApiError.badRequest('Invalid phone number');
  const r = getRedis();
  const raw = await r.get(otpKey(ph));
  if (!raw) throw ApiError.badRequest('OTP expired, request a new one', 'OTP_EXPIRED');
  const rec = JSON.parse(raw);
  if (rec.tries >= 5) {
    await r.del(otpKey(ph));
    throw ApiError.tooMany('Too many wrong attempts, request a new OTP');
  }
  if (rec.h !== sha256(`${ph}:${otp}`)) {
    rec.tries += 1;
    await r.set(otpKey(ph), JSON.stringify(rec), 'KEEPTTL');
    throw ApiError.badRequest('Incorrect OTP', 'OTP_INVALID');
  }
  await r.del(otpKey(ph));
  let user = await User.findOne({ phone: ph });
  if (!user) {
    user = await User.create({ name: name || `Patient ${ph.slice(-4)}`, phone: ph, phoneVerified: true, role: ROLES.PATIENT, prefs: { whatsappNumber: ph } });
  } else if (!user.isActive) throw ApiError.forbidden('Account is disabled', 'ACCOUNT_INACTIVE');
  user.phoneVerified = true;
  return session(user, meta);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (user.passwordHash && !(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect', 'BAD_PASSWORD');
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  const { revokeAllForUser } = await import('./token.service.js');
  await revokeAllForUser(user._id);
}
