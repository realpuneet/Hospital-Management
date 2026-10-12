import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as users from '../services/user.service.js';
import * as auth from '../services/auth.service.js';
import * as notif from '../services/notification.service.js';

export const updateProfile = asyncHandler(async (req, res) => ok(res, await users.updateProfile(req.user._id, req.body), 'Profile updated'));
export const updatePrefs = asyncHandler(async (req, res) => ok(res, await users.updatePrefs(req.user._id, req.body), 'Preferences saved'));
export const changePassword = asyncHandler(async (req, res) => {
  await auth.changePassword(req.user._id, req.body);
  return ok(res, null, 'Password changed, please login again');
});

export const addAddress = asyncHandler(async (req, res) => created(res, (await users.addAddress(req.user, req.body)).addresses));
export const updateAddress = asyncHandler(async (req, res) => ok(res, (await users.updateAddress(req.user, req.params.id, req.body)).addresses));
export const removeAddress = asyncHandler(async (req, res) => ok(res, (await users.removeAddress(req.user, req.params.id)).addresses));

export const addMember = asyncHandler(async (req, res) => created(res, (await users.addMember(req.user, req.body)).familyMembers));
export const updateMember = asyncHandler(async (req, res) => ok(res, (await users.updateMember(req.user, req.params.id, req.body)).familyMembers));
export const removeMember = asyncHandler(async (req, res) => ok(res, (await users.removeMember(req.user, req.params.id)).familyMembers));

export const notifications = asyncHandler(async (req, res) => {
  const r = await notif.listNotifications(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore, unread: r.unread });
});
export const markRead = asyncHandler(async (req, res) => {
  await notif.markRead(req.user._id, req.params.id);
  return noContent(res);
});
