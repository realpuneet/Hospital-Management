import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as admin from '../services/admin.service.js';
import * as doctors from '../services/doctor.service.js';
import * as appts from '../services/appointment.service.js';
import { adminDashboard } from '../services/analytics.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { getImageKit } from '../config/imagekit.js';
import { ApiError } from '../utils/ApiError.js';

export const dashboard = asyncHandler(async (_req, res) => ok(res, await adminDashboard()));

export const users = asyncHandler(async (req, res) => {
  const r = await admin.listUsers(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const createStaff = asyncHandler(async (req, res) => created(res, await admin.createStaff(req.body), 'Staff account created'));
export const setActive = asyncHandler(async (req, res) => ok(res, await admin.setUserActive(req.user._id, req.params.id, req.body.isActive)));

export const doctorList = asyncHandler(async (req, res) => {
  const r = await doctors.adminListDoctors(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const doctorCreate = asyncHandler(async (req, res) => created(res, await doctors.adminCreateDoctor(req.body), 'Doctor added'));
export const doctorUpdate = asyncHandler(async (req, res) => ok(res, await doctors.adminUpdateDoctor(req.params.id, req.body), 'Doctor updated'));

export const departmentList = asyncHandler(async (_req, res) => ok(res, await doctors.listAllDepartments()));
export const departmentCreate = asyncHandler(async (req, res) => created(res, await doctors.createDepartment(req.body)));
export const departmentUpdate = asyncHandler(async (req, res) => ok(res, await doctors.updateDepartment(req.params.id, req.body)));
export const departmentDelete = asyncHandler(async (req, res) => {
  await doctors.deleteDepartment(req.params.id);
  return noContent(res);
});

export const appointments = asyncHandler(async (req, res) => {
  const r = await admin.listAppointments(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const appointmentCancel = asyncHandler(async (req, res) => ok(res, await appts.cancelAppointment(req.user, req.params.id, req.body.reason || 'Cancelled by hospital')));
export const appointmentReschedule = asyncHandler(async (req, res) => ok(res, await appts.rescheduleAppointment(req.user, req.params.id, req.body)));

export const logs = asyncHandler(async (req, res) => {
  const r = await admin.notificationLogs(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const settingsGet = asyncHandler(async (_req, res) => ok(res, await getSettings()));
export const settingsUpdate = asyncHandler(async (req, res) => ok(res, await updateSettings(req.body), 'Settings saved'));

/** ImageKit signed upload parameters for direct browser uploads. */
export const uploadAuth = asyncHandler(async (req, res) => {
  const ik = getImageKit();
  if (!ik) throw new ApiError(503, 'Image uploads are not configured', 'UPLOADS_DISABLED');
  return ok(res, { ...ik.getAuthenticationParameters(), publicKey: process.env.IMAGEKIT_PUBLIC_KEY, urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, folder: `/carepulse/${req.user.role}` });
});
