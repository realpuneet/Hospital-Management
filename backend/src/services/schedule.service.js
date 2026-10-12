import { Appointment } from '../models/Appointment.js';
import { ApiError } from '../utils/ApiError.js';
import { APPT_ACTIVE, APPT_STATUS } from '../utils/constants.js';
import { addDays, generateSlots, istToDate, todayStr, isValidDateStr, weekdayOf } from '../utils/helpers.js';
import { workingRanges } from '../utils/slots.js';
import { getSettings } from './settings.service.js';

/** Slot start times currently occupied (booked or on a live payment hold). */
async function takenStarts(doctorId, dates) {
  const rows = await Appointment.find({
    doctor: doctorId,
    date: { $in: dates },
    slotLocked: true,
    status: { $in: APPT_ACTIVE },
  })
    .select('startAt status holdExpiresAt')
    .lean();
  const now = Date.now();
  return new Set(
    rows
      .filter((r) => !(r.status === APPT_STATUS.PENDING_PAYMENT && r.holdExpiresAt && r.holdExpiresAt.getTime() < now))
      .map((r) => r.startAt.getTime()),
  );
}

/** Slots of one day with availability flags. */
export async function getDaySlots(profile, date, mode) {
  if (!isValidDateStr(date)) throw ApiError.badRequest('Invalid date');
  const settings = await getSettings();
  const ranges = workingRanges(profile, date, mode);
  const all = generateSlots(date, ranges, profile.slotMinutes);
  const taken = await takenStarts(profile._id, [date]);
  const earliest = Date.now() + settings.minLeadMinutes * 60_000;
  return all.map((s) => ({
    time: s.time,
    startAt: s.startAt,
    endAt: s.endAt,
    available: s.startAt.getTime() >= earliest && !taken.has(s.startAt.getTime()),
  }));
}

/** Next N days summary for the calendar strip: { date, total, available }. */
export async function getAvailabilityCalendar(profile, mode, days = 14) {
  const settings = await getSettings();
  const horizon = Math.min(days, settings.bookingWindowDays);
  const start = todayStr();
  const dates = Array.from({ length: horizon + 1 }, (_, i) => addDays(start, i));
  const taken = await takenStarts(profile._id, dates);
  const earliest = Date.now() + settings.minLeadMinutes * 60_000;
  return dates.map((date) => {
    const slots = generateSlots(date, workingRanges(profile, date, mode), profile.slotMinutes);
    const available = slots.filter((s) => s.startAt.getTime() >= earliest && !taken.has(s.startAt.getTime())).length;
    return { date, weekday: weekdayOf(date), total: slots.length, available };
  });
}

/** Validate a requested slot against the doctor's template, lead-time and booking window. Returns {startAt,endAt}. */
export async function assertBookableSlot(profile, date, time, mode) {
  const settings = await getSettings();
  if (!isValidDateStr(date) || !/^\d{2}:\d{2}$/.test(time)) throw ApiError.badRequest('Invalid date/time');
  const today = todayStr();
  if (date < today || date > addDays(today, settings.bookingWindowDays)) {
    throw ApiError.badRequest(`Bookings are open for the next ${settings.bookingWindowDays} days`, 'OUT_OF_WINDOW');
  }
  const slot = generateSlots(date, workingRanges(profile, date, mode), profile.slotMinutes).find((s) => s.time === time);
  if (!slot) throw ApiError.badRequest('Doctor is not available at this time', 'SLOT_UNAVAILABLE');
  if (slot.startAt.getTime() < Date.now() + settings.minLeadMinutes * 60_000) {
    throw ApiError.badRequest(`Please book at least ${settings.minLeadMinutes} minutes ahead`, 'TOO_SOON');
  }
  return { startAt: slot.startAt, endAt: slot.endAt };
}

export { istToDate, workingRanges };
