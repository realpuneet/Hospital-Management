import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import * as doctors from '../services/doctor.service.js';
import * as schedule from '../services/schedule.service.js';
import * as medicines from '../services/medicine.service.js';
import { publicSettings } from '../services/settings.service.js';
import { todayStr } from '../utils/helpers.js';

export const departments = asyncHandler(async (_req, res) => ok(res, await doctors.listDepartments()));
export const doctorList = asyncHandler(async (req, res) => {
  const r = await doctors.listDoctors(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const doctorGet = asyncHandler(async (req, res) => ok(res, await doctors.getDoctor(req.params.id)));

/** ?date=YYYY-MM-DD -> slots for that day; without date -> availability calendar */
export const doctorSlots = asyncHandler(async (req, res) => {
  const profile = await doctors.getProfileDoc(req.params.id);
  const mode = req.query.mode;
  if (req.query.date) {
    return ok(res, { date: req.query.date, slotMinutes: profile.slotMinutes, slots: await schedule.getDaySlots(profile, req.query.date, mode) });
  }
  return ok(res, { today: todayStr(), days: await schedule.getAvailabilityCalendar(profile, mode, req.query.days || 14) });
});

export const medicineList = asyncHandler(async (req, res) => {
  const r = await medicines.listMedicines(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const medicineGet = asyncHandler(async (req, res) => ok(res, await medicines.getMedicine(req.params.id)));
export const medicineCategories = asyncHandler(async (_req, res) => ok(res, await medicines.listCategories()));
export const settings = asyncHandler(async (_req, res) => ok(res, await publicSettings()));
