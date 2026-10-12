import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import * as appts from '../services/appointment.service.js';
import * as rx from '../services/prescription.service.js';
import * as doctors from '../services/doctor.service.js';
import { doctorDashboard } from '../services/analytics.service.js';

export const dashboard = asyncHandler(async (req, res) => ok(res, await doctorDashboard(req.user._id)));
export const appointments = asyncHandler(async (req, res) => ok(res, await appts.listForDoctor(req.user._id, req.query)));
export const appointment = asyncHandler(async (req, res) => ok(res, await appts.getForUser(req.user, req.params.id)));
export const changeStatus = asyncHandler(async (req, res) => ok(res, await appts.changeStatus(req.user, req.params.id, req.body.status, req.body.note)));
export const reschedule = asyncHandler(async (req, res) => ok(res, await appts.rescheduleAppointment(req.user, req.params.id, req.body), 'Appointment rescheduled'));
export const consultation = asyncHandler(async (req, res) => ok(res, await appts.saveConsultation(req.user, req.params.id, req.body), 'Consultation saved'));
export const prescribe = asyncHandler(async (req, res) => ok(res, await rx.upsertForAppointment(req.user, req.params.id, req.body), 'Prescription saved'));
export const patientHistory = asyncHandler(async (req, res) => ok(res, await appts.patientHistoryForDoctor(req.user._id, req.params.patientId)));
export const prescriptions = asyncHandler(async (req, res) => {
  const r = await rx.listForDoctor(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});

export const profile = asyncHandler(async (req, res) => ok(res, await doctors.myProfile(req.user._id)));
export const updateProfile = asyncHandler(async (req, res) => ok(res, await doctors.updateMyProfile(req.user._id, req.body), 'Profile updated'));
export const updateSchedule = asyncHandler(async (req, res) => ok(res, await doctors.updateMySchedule(req.user._id, req.body), 'Schedule updated'));
export const addLeave = asyncHandler(async (req, res) => ok(res, await doctors.addLeave(req.user, req.body)));
export const removeLeave = asyncHandler(async (req, res) => ok(res, await doctors.removeLeave(req.user._id, req.params.date), 'Leave removed'));
