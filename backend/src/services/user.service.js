import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizePhone } from '../utils/helpers.js';

export async function updateProfile(userId, data) {
  const patch = { ...data };
  if (patch.phone) {
    patch.phone = normalizePhone(patch.phone);
    if (!patch.phone) throw ApiError.badRequest('Invalid phone number');
  }
  try {
    const u = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true, runValidators: true });
    return u;
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Email or phone already in use', 'DUPLICATE');
    throw e;
  }
}

export async function updatePrefs(userId, prefs) {
  const set = Object.fromEntries(Object.entries(prefs).map(([k, v]) => [`prefs.${k}`, v]));
  if (set['prefs.whatsappNumber'] && !normalizePhone(set['prefs.whatsappNumber'])) throw ApiError.badRequest('Invalid WhatsApp number');
  if (set['prefs.whatsappNumber']) set['prefs.whatsappNumber'] = normalizePhone(set['prefs.whatsappNumber']);
  return User.findByIdAndUpdate(userId, { $set: set }, { new: true });
}

export async function addAddress(user, data) {
  if (user.addresses.length >= 8) throw ApiError.badRequest('Maximum 8 addresses');
  if (data.isDefault || !user.addresses.length) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push({ ...data, isDefault: data.isDefault || !user.addresses.length });
  await user.save();
  return user;
}
export async function updateAddress(user, id, data) {
  const a = user.addresses.id(id);
  if (!a) throw ApiError.notFound('Address not found');
  if (data.isDefault) user.addresses.forEach((x) => (x.isDefault = false));
  a.set(data);
  await user.save();
  return user;
}
export async function removeAddress(user, id) {
  const a = user.addresses.id(id);
  if (!a) throw ApiError.notFound('Address not found');
  a.deleteOne();
  if (user.addresses.length && !user.addresses.some((x) => x.isDefault)) user.addresses[0].isDefault = true;
  await user.save();
  return user;
}

export async function addMember(user, data) {
  if (user.familyMembers.length >= 10) throw ApiError.badRequest('Maximum 10 family members');
  user.familyMembers.push(data);
  await user.save();
  return user;
}
export async function updateMember(user, id, data) {
  const m = user.familyMembers.id(id);
  if (!m) throw ApiError.notFound('Family member not found');
  m.set(data);
  await user.save();
  return user;
}
export async function removeMember(user, id) {
  const m = user.familyMembers.id(id);
  if (!m) throw ApiError.notFound('Family member not found');
  m.deleteOne();
  await user.save();
  return user;
}
