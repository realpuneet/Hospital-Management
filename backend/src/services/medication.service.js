import { Medication } from '../models/Medication.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { NOTIFY_TYPE as T } from '../utils/constants.js';
import { addDays, dateStr, fromMinutes, timeStr, toMinutes, todayStr } from '../utils/helpers.js';
import { notifyUser } from './notification.service.js';
import { timesFromDosage } from '../utils/dosage.js';

export { timesFromDosage };

const MEAL_LABEL = { before_food: 'before food', after_food: 'after food', with_food: 'with food', any: '' };

/** Replace the medication courses generated from a prescription (idempotent on edit). */
export async function syncFromPrescription(rx) {
  await Medication.updateMany({ prescription: rx._id }, { isActive: false });
  const start = todayStr();
  const docs = rx.items.map((it) => ({
    patient: rx.patient,
    prescription: rx._id,
    name: `${it.name}${it.strength ? ` ${it.strength}` : ''}`,
    dosage: it.dosage,
    meal: it.meal,
    instructions: it.instructions,
    times: timesFromDosage(it.dosage, it.timings),
    startDate: start,
    endDate: addDays(start, Math.max(1, it.durationDays) - 1),
  }));
  if (docs.length) await Medication.insertMany(docs);
}

export async function listMedications(userId, { activeOnly = true } = {}) {
  const q = { patient: userId };
  if (activeOnly) Object.assign(q, { isActive: true, endDate: { $gte: todayStr() } });
  return Medication.find(q).sort({ createdAt: -1 }).limit(100).lean();
}

/** Today's dose checklist across all active courses. */
export async function todaysDoses(userId) {
  const date = todayStr();
  const meds = await Medication.find({ patient: userId, isActive: true, startDate: { $lte: date }, endDate: { $gte: date } }).lean();
  const nowMin = toMinutes(timeStr());
  const doses = meds.flatMap((m) =>
    m.times.map((t) => {
      const key = `${date}@${t}`;
      return {
        medicationId: m._id,
        name: m.name,
        dosage: m.dosage,
        meal: MEAL_LABEL[m.meal] || '',
        time: t,
        key,
        taken: m.taken?.some((x) => x.key === key) || false,
        overdue: !m.taken?.some((x) => x.key === key) && toMinutes(t) + 30 < nowMin,
      };
    }),
  );
  doses.sort((a, b) => a.time.localeCompare(b.time));
  const taken = doses.filter((d) => d.taken).length;
  return { date, doses, summary: { total: doses.length, taken, adherence: doses.length ? Math.round((taken / doses.length) * 100) : 0 } };
}

export async function markDose(userId, medId, key, taken = true) {
  if (!/^\d{4}-\d{2}-\d{2}@\d{2}:\d{2}$/.test(key)) throw ApiError.badRequest('Invalid dose key');
  const res = taken
    ? await Medication.updateOne({ _id: medId, patient: userId, 'taken.key': { $ne: key } }, { $push: { taken: { key, at: new Date() } } })
    : await Medication.updateOne({ _id: medId, patient: userId }, { $pull: { taken: { key } } });
  if (!res.matchedCount && taken) {
    const exists = await Medication.exists({ _id: medId, patient: userId });
    if (!exists) throw ApiError.notFound('Medication not found');
  }
  return todaysDoses(userId);
}

export async function createManual(userId, data) {
  const start = data.startDate || todayStr();
  return Medication.create({
    patient: userId,
    name: data.name,
    dosage: data.dosage,
    meal: data.meal,
    instructions: data.instructions,
    times: data.times?.length ? [...new Set(data.times)].sort() : timesFromDosage(data.dosage),
    startDate: start,
    endDate: addDays(start, Math.max(1, data.durationDays || 7) - 1),
    remindersOn: data.remindersOn ?? true,
  });
}

export async function updateMedication(userId, id, patch) {
  const m = await Medication.findOneAndUpdate({ _id: id, patient: userId }, { $set: patch }, { new: true });
  if (!m) throw ApiError.notFound('Medication not found');
  return m;
}
export async function stopMedication(userId, id) {
  const m = await Medication.findOneAndUpdate({ _id: id, patient: userId }, { isActive: false }, { new: true });
  if (!m) throw ApiError.notFound('Medication not found');
  return m;
}

/** Called every minute by the worker. Fires each dose reminder at most once. */
export async function sendMedicationReminders() {
  const now = new Date();
  const date = dateStr(now);
  const nowMin = toMinutes(timeStr(now));
  const window = [fromMinutes(nowMin), nowMin > 0 ? fromMinutes(nowMin - 1) : fromMinutes(0)];
  const due = await Medication.find({
    isActive: true,
    remindersOn: true,
    startDate: { $lte: date },
    endDate: { $gte: date },
    times: { $in: window },
  }).limit(2000);
  let sent = 0;
  for (const m of due) {
    const t = m.times.find((x) => window.includes(x));
    const key = `${date}@${t}`;
    if (m.taken.some((x) => x.key === key)) continue;
    const claimed = await Medication.findOneAndUpdate({ _id: m._id, lastReminderKey: { $ne: key } }, { lastReminderKey: key });
    if (!claimed) continue;
    const user = await User.findById(m.patient).lean();
    if (!user || user.prefs?.medicineReminders === false) continue;
    await notifyUser({
      user,
      type: T.MED_REMINDER,
      title: `Time for ${m.name}`,
      body: `${m.dosage || ''} ${MEAL_LABEL[m.meal] || ''}`.trim(),
      kind: 'medicine',
      data: { medicationId: m._id, key },
      vars: { medicineName: m.name, dosage: m.dosage, mealLabel: MEAL_LABEL[m.meal], link: '/medications' },
      ref: { kind: 'medication', id: m._id },
    });
    sent += 1;
  }
  return sent;
}
