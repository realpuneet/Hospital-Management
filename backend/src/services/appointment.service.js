import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Review } from '../models/Review.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import {
  APPT_ACTIVE,
  APPT_MODE,
  APPT_STATUS as S,
  APPT_TRANSITIONS,
  NOTIFY_TYPE as T,
  PAY_PURPOSE,
  PAY_STATUS,
  ROLES,
} from '../utils/constants.js';
import { dateStr, formatIST, genCode, randomToken } from '../utils/helpers.js';
import { cursorPaginate } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';
import { emit, emitToUser } from '../sockets/index.js';
import { getSettings } from './settings.service.js';
import { assertBookableSlot } from './schedule.service.js';
import { createPaymentOrder, refundPayment, registerPaymentHandler } from './payment.service.js';
import { notifyUser } from './notification.service.js';

const POPULATE_FULL = [
  { path: 'patient', select: 'name email phone prefs gender dob bloodGroup allergies chronicConditions avatar' },
  { path: 'doctorUser', select: 'name avatar email phone' },
  { path: 'department', select: 'name slug' },
  { path: 'doctor', select: 'slug room specialization slotMinutes fees' },
];

export const loadFull = (id) => Appointment.findById(id).populate(POPULATE_FULL);

/* ---------------------------------- helpers --------------------------------- */
function vars(a, extra = {}) {
  return {
    patientName: a.patient.name,
    forName: a.forMember?.name,
    doctorName: `Dr. ${a.doctorUser.name}`,
    department: a.department?.name,
    when: formatIST(a.startAt),
    mode: a.mode,
    place: a.doctor?.room ? `In-clinic · ${a.doctor.room}` : 'In-clinic visit',
    meetingUrl: a.meetingUrl,
    code: a.code,
    fee: a.paymentStatus === PAY_STATUS.PAID ? a.fee : null,
    link: `/appointments/${a._id}`,
    ...extra,
  };
}

function broadcast(a, event = 'appointment:updated') {
  const payload = { id: a._id, status: a.status, startAt: a.startAt, code: a.code };
  emitToUser(a.patient._id || a.patient, event, payload);
  emitToUser(a.doctorUser._id || a.doctorUser, event, payload);
  const did = String(a.doctor._id || a.doctor);
  emit(`doctor:${did}`, event, payload);
  emit(`slots:${did}`, 'slots:changed', { doctorId: did, date: a.date });
}

async function notifyPatient(a, type, title, body, kind = 'confirmation', extra = {}) {
  return notifyUser({
    user: a.patient,
    type,
    title,
    body,
    kind,
    data: { appointmentId: a._id },
    // OPTIONAL channels: the patient's per-booking choice (checkboxes at booking time)
    email: a.notify?.email,
    whatsapp: a.notify?.whatsapp,
    vars: vars(a, extra),
    ref: { kind: 'appointment', id: a._id },
  });
}
const notifyDoctor = (a, type, title, body) =>
  notifyUser({ userId: a.doctorUser._id || a.doctorUser, type, title, body, kind: 'system', email: false, whatsapp: false, data: { appointmentId: a._id } });

const asId = (x) => String(x?._id || x);

/* ----------------------------------- booking ---------------------------------- */
export async function bookAppointment(user, input) {
  const settings = await getSettings();
  const profile = await DoctorProfile.findOne({ _id: input.doctorId, isActive: true }).populate('user', 'name isActive');
  if (!profile || !profile.user?.isActive) throw ApiError.notFound('Doctor not found');
  if (!profile.isAcceptingBookings) throw ApiError.conflict('This doctor is not accepting bookings right now', 'NOT_ACCEPTING');
  if (!profile.modes.includes(input.mode)) throw ApiError.badRequest(`Doctor does not offer ${input.mode.replace('_', ' ')} consultations`);

  const { startAt, endAt } = await assertBookableSlot(profile, input.date, input.time, input.mode);

  let forMember;
  if (input.memberId) {
    const m = user.familyMembers.id(input.memberId);
    if (!m) throw ApiError.badRequest('Family member not found');
    const age = m.dob ? Math.floor((Date.now() - m.dob.getTime()) / 31557600000) : undefined;
    forMember = { memberId: m._id, name: m.name, relation: m.relation, gender: m.gender, age };
  }

  // free any stale payment hold that blocks this very slot (so the unique index does not reject us)
  await Appointment.updateMany(
    { doctor: profile._id, startAt, status: S.PENDING_PAYMENT, holdExpiresAt: { $lt: new Date() } },
    { $set: { status: S.EXPIRED, slotLocked: false }, $unset: { holdExpiresAt: 1 } },
  );

  // one person cannot hold two overlapping consultations
  const clashFilter = { patient: user._id, slotLocked: true, status: { $in: APPT_ACTIVE }, startAt: { $lt: endAt }, endAt: { $gt: startAt } };
  clashFilter['forMember.memberId'] = forMember ? forMember.memberId : { $exists: false };
  const clash = await Appointment.findOne(clashFilter).lean();
  if (clash) throw ApiError.conflict('You already have an appointment at this time', 'PATIENT_CLASH');

  const fee = profile.fees?.[input.mode] || 0;
  let payMode = input.payMode || 'online';
  if (fee === 0) payMode = 'free';
  else if (input.mode === APPT_MODE.VIDEO) payMode = 'online';
  else if (!settings.paymentRequired) payMode = input.payMode || 'at_clinic';
  if (payMode === 'at_clinic' && input.mode !== APPT_MODE.IN_PERSON) throw ApiError.badRequest('Pay-at-clinic is only for in-person visits');

  const needsPayment = payMode === 'online' && fee > 0 && settings.paymentRequired;
  const code = genCode('APT');
  const notify = {
    email: input.notify?.email ?? Boolean(user.email && user.prefs?.emailConfirmations),
    whatsapp: input.notify?.whatsapp ?? Boolean(user.prefs?.whatsappConfirmations),
  };

  let appt;
  try {
    appt = await Appointment.create({
      code,
      patient: user._id,
      forMember,
      doctor: profile._id,
      doctorUser: profile.user._id,
      department: profile.department,
      mode: input.mode,
      date: input.date,
      startAt,
      endAt,
      status: needsPayment ? S.PENDING_PAYMENT : S.BOOKED,
      holdExpiresAt: needsPayment ? new Date(Date.now() + settings.slotHoldMinutes * 60_000) : undefined,
      reason: input.reason,
      symptoms: input.symptoms || [],
      attachments: input.attachments || [],
      fee,
      payMode,
      paymentStatus: needsPayment ? PAY_STATUS.PENDING : payMode === 'at_clinic' ? PAY_STATUS.AT_CLINIC : fee === 0 ? PAY_STATUS.NONE : PAY_STATUS.PENDING,
      notify,
      meetingRoom: input.mode === APPT_MODE.VIDEO ? `carepulse-${code.toLowerCase()}-${randomToken(3)}` : undefined,
      history: [{ at: new Date(), by: user._id, byRole: user.role, action: 'created', to: { startAt } }],
    });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('That slot was just taken, please pick another', 'SLOT_TAKEN');
    throw e;
  }
  if (appt.meetingRoom) {
    appt.meetingUrl = `${env.MEET_BASE_URL}/${appt.meetingRoom}`;
    await appt.save();
  }

  let payment = null;
  if (needsPayment) {
    payment = await createPaymentOrder({ user, purpose: PAY_PURPOSE.APPOINTMENT, refId: appt._id, amount: fee, receipt: code });
    appt.payment = payment.paymentId;
    await appt.save();
    emit(`slots:${asId(profile)}`, 'slots:changed', { doctorId: asId(profile), date: appt.date });
  } else {
    await afterConfirmed(appt._id);
  }
  return { appointment: await loadFull(appt._id), payment };
}

/** Everything that must happen once an appointment becomes BOOKED. */
async function afterConfirmed(id) {
  const a = await loadFull(id);
  if (!a) return;
  broadcast(a, 'appointment:new');
  await Promise.all([
    notifyPatient(a, T.APPT_CONFIRMED, 'Appointment confirmed', `${vars(a).doctorName} · ${vars(a).when}`, 'confirmation'),
    notifyDoctor(a, T.APPT_NEW_FOR_DOCTOR, 'New appointment', `${a.patient.name} · ${formatIST(a.startAt)} · ${a.mode === 'video' ? 'Video' : 'In-clinic'}`),
  ]);
}

/** Payment webhook / verify callback. Handles the "paid after hold expired" race safely. */
export async function confirmAfterPayment(payment) {
  const base = { $set: { status: S.BOOKED, paymentStatus: PAY_STATUS.PAID, payment: payment._id, slotLocked: true }, $unset: { holdExpiresAt: 1 }, $push: { history: { at: new Date(), action: 'paid', note: `₹${payment.amount}` } } };
  let appt = await Appointment.findOneAndUpdate({ _id: payment.refId, status: S.PENDING_PAYMENT }, base, { new: true });
  if (!appt) {
    const late = await Appointment.findById(payment.refId);
    if (!late) return;
    if (late.status === S.BOOKED) return; // already confirmed (idempotent)
    if (late.status === S.EXPIRED) {
      // try to re-claim the slot; the unique index tells us if somebody else took it
      try {
        appt = await Appointment.findOneAndUpdate({ _id: late._id, status: S.EXPIRED }, base, { new: true });
      } catch (e) {
        if (e.code !== 11000) throw e;
        await refundPayment(payment._id, { reason: 'slot taken during payment' }).catch((err) => logger.error({ err: err.message }, 'auto-refund failed'));
        await Appointment.updateOne({ _id: late._id }, { status: S.CANCELLED, paymentStatus: PAY_STATUS.REFUNDED, cancelReason: 'Slot was taken before payment completed', cancelledBy: 'system', cancelledAt: new Date() });
        const f = await loadFull(late._id);
        await notifyPatient(f, T.APPT_CANCELLED, 'Booking could not be completed', 'Your payment will be refunded automatically.', 'confirmation', { reason: 'Slot was taken before payment completed', refund: payment.amount });
        return;
      }
    }
  }
  if (appt) await afterConfirmed(appt._id);
}
registerPaymentHandler(PAY_PURPOSE.APPOINTMENT, { onPaid: confirmAfterPayment });

/** Re-open payment for a pending appointment (hold extended once). */
export async function payAppointment(user, id) {
  const a = await Appointment.findOne({ _id: id, patient: user._id });
  if (!a) throw ApiError.notFound('Appointment not found');
  if (a.status !== S.PENDING_PAYMENT) throw ApiError.conflict('Nothing to pay for this appointment');
  const settings = await getSettings();
  if (a.holdExpiresAt < new Date()) throw ApiError.conflict('Your slot hold expired, please book again', 'HOLD_EXPIRED');
  a.holdExpiresAt = new Date(Date.now() + settings.slotHoldMinutes * 60_000);
  await a.save();
  return createPaymentOrder({ user, purpose: PAY_PURPOSE.APPOINTMENT, refId: a._id, amount: a.fee, receipt: a.code });
}

/* ------------------------------ cancel / reschedule ------------------------------ */
function actorFlags(actor) {
  return { isPatient: actor.role === ROLES.PATIENT, isDoctor: actor.role === ROLES.DOCTOR, isAdmin: actor.role === ROLES.ADMIN };
}
async function assertAccess(actor, a) {
  const { isPatient, isDoctor, isAdmin } = actorFlags(actor);
  const ok = isAdmin || (isPatient && asId(a.patient) === asId(actor)) || (isDoctor && asId(a.doctorUser) === asId(actor));
  if (!ok) throw ApiError.notFound('Appointment not found');
}

export async function cancelAppointment(actor, id, reason) {
  const existing = await Appointment.findById(id);
  if (!existing) throw ApiError.notFound('Appointment not found');
  await assertAccess(actor, existing);
  const settings = await getSettings();
  const allowed = actor.role === ROLES.PATIENT ? [S.PENDING_PAYMENT, S.BOOKED] : [S.PENDING_PAYMENT, S.BOOKED, S.CHECKED_IN];
  if (!allowed.includes(existing.status)) throw ApiError.conflict(`Cannot cancel an appointment that is ${existing.status.replace('_', ' ')}`, 'BAD_STATE');

  const hoursLeft = (existing.startAt.getTime() - Date.now()) / 3600_000;
  const refundEligible = actor.role !== ROLES.PATIENT || hoursLeft >= settings.freeCancelHours;

  const a = await Appointment.findOneAndUpdate(
    { _id: id, status: { $in: allowed } },
    {
      $set: { status: S.CANCELLED, slotLocked: false, cancelledBy: actor.role, cancelReason: reason, cancelledAt: new Date() },
      $unset: { holdExpiresAt: 1 },
      $push: { history: { at: new Date(), by: actor._id, byRole: actor.role, action: 'cancelled', from: existing.status, note: reason } },
    },
    { new: true },
  );
  if (!a) throw ApiError.conflict('Appointment state changed, please refresh', 'BAD_STATE');

  let refunded = 0;
  if (a.paymentStatus === PAY_STATUS.PAID && a.payment) {
    if (refundEligible) {
      const r = await refundPayment(a.payment, { reason: reason || 'appointment cancelled' });
      if (r) {
        refunded = r.refund.amount;
        await Appointment.updateOne({ _id: a._id }, { paymentStatus: PAY_STATUS.REFUNDED });
      }
    }
  }
  const full = await loadFull(id);
  broadcast(full);
  const extra = { reason, refund: refunded || null };
  await Promise.all([
    notifyPatient(full, T.APPT_CANCELLED, 'Appointment cancelled', `${vars(full).doctorName} · ${vars(full).when}`, 'confirmation', extra),
    actor.role !== ROLES.DOCTOR ? notifyDoctor(full, T.APPT_CANCELLED, 'Appointment cancelled', `${full.patient.name} · ${formatIST(full.startAt)}`) : null,
  ]);
  return { appointment: full, refunded, refundEligible };
}

export async function rescheduleAppointment(actor, id, { date, time, mode, reason }) {
  const existing = await Appointment.findById(id);
  if (!existing) throw ApiError.notFound('Appointment not found');
  await assertAccess(actor, existing);
  const settings = await getSettings();
  const isPatient = actor.role === ROLES.PATIENT;

  if (existing.status !== S.BOOKED) throw ApiError.conflict('Only confirmed appointments can be rescheduled', 'BAD_STATE');
  if (isPatient) {
    if (existing.rescheduleCount >= settings.maxReschedules) throw ApiError.conflict(`You can reschedule an appointment only ${settings.maxReschedules} times`, 'RESCHEDULE_LIMIT');
    if ((existing.startAt.getTime() - Date.now()) / 3600_000 < settings.freeCancelHours) {
      throw ApiError.conflict(`Rescheduling closes ${settings.freeCancelHours} hours before the appointment`, 'RESCHEDULE_CLOSED');
    }
  }
  const profile = await DoctorProfile.findById(existing.doctor);
  const newMode = mode || existing.mode;
  if (newMode !== existing.mode && (profile.fees?.[newMode] || 0) !== existing.fee) {
    throw ApiError.badRequest('Consultation fee differs between modes; please cancel and book again');
  }
  const { startAt, endAt } = await assertBookableSlot(profile, date, time, newMode);
  if (startAt.getTime() === existing.startAt.getTime()) throw ApiError.badRequest('Choose a different time');

  let a;
  try {
    a = await Appointment.findOneAndUpdate(
      { _id: id, status: S.BOOKED, startAt: existing.startAt },
      {
        $set: {
          date, startAt, endAt, mode: newMode, reminders: {},
          ...(newMode === APPT_MODE.VIDEO && !existing.meetingRoom ? { meetingRoom: `carepulse-${existing.code.toLowerCase()}-${randomToken(3)}` } : {}),
        },
        $inc: { rescheduleCount: isPatient ? 1 : 0 },
        $push: {
          rescheduledFrom: { startAt: existing.startAt, endAt: existing.endAt, at: new Date() },
          history: { at: new Date(), by: actor._id, byRole: actor.role, action: 'rescheduled', from: { startAt: existing.startAt }, to: { startAt }, note: reason },
        },
      },
      { new: true },
    );
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('That slot was just taken, please pick another', 'SLOT_TAKEN');
    throw e;
  }
  if (!a) throw ApiError.conflict('Appointment changed, please refresh', 'BAD_STATE');
  if (a.mode === APPT_MODE.VIDEO && !a.meetingUrl) {
    a.meetingUrl = `${env.MEET_BASE_URL}/${a.meetingRoom}`;
    await a.save();
  }
  const full = await loadFull(id);
  broadcast(full);
  // the old slot is free again
  emit(`slots:${asId(full.doctor)}`, 'slots:changed', { doctorId: asId(full.doctor), date: dateStr(existing.startAt) });
  const extra = { previous: formatIST(existing.startAt) };
  await Promise.all([
    notifyPatient(full, T.APPT_RESCHEDULED, 'Appointment rescheduled', `Now ${vars(full).when}`, 'confirmation', extra),
    notifyDoctor(full, T.APPT_RESCHEDULED, 'Appointment rescheduled', `${full.patient.name} · now ${formatIST(full.startAt)}`),
  ]);
  return full;
}

/* ------------------------------- doctor / staff flow ------------------------------ */
export async function changeStatus(actor, id, to, note) {
  const existing = await Appointment.findById(id);
  if (!existing) throw ApiError.notFound('Appointment not found');
  await assertAccess(actor, existing);
  if (actor.role === ROLES.PATIENT) throw ApiError.forbidden();
  if (to === S.CANCELLED) return (await cancelAppointment(actor, id, note)).appointment;
  if (!(APPT_TRANSITIONS[existing.status] || []).includes(to)) {
    throw ApiError.conflict(`Cannot move from ${existing.status} to ${to}`, 'BAD_TRANSITION');
  }
  const set = { status: to };
  const now = new Date();
  if (to === S.CHECKED_IN) set.checkedInAt = now;
  if (to === S.IN_CONSULTATION) set.startedAt = now;
  if (to === S.COMPLETED) set.completedAt = now;
  if (to === S.NO_SHOW) set.slotLocked = false;
  const a = await Appointment.findOneAndUpdate(
    { _id: id, status: existing.status },
    { $set: set, $push: { history: { at: now, by: actor._id, byRole: actor.role, action: 'status', from: existing.status, to, note } } },
    { new: true },
  );
  if (!a) throw ApiError.conflict('Appointment state changed, please refresh', 'BAD_STATE');
  const full = await loadFull(id);
  broadcast(full);
  if (to === S.COMPLETED) {
    await notifyPatient(full, T.APPT_COMPLETED, 'Consultation completed', 'Your consultation summary and prescription are available.', 'system');
  }
  return full;
}

export async function saveConsultation(actor, id, data) {
  const a = await Appointment.findById(id);
  if (!a) throw ApiError.notFound('Appointment not found');
  if (actor.role !== ROLES.ADMIN && asId(a.doctorUser) !== asId(actor)) throw ApiError.notFound('Appointment not found');
  if ([S.CANCELLED, S.EXPIRED, S.PENDING_PAYMENT].includes(a.status)) throw ApiError.conflict('Consultation cannot be edited in this state');
  a.consultation = { ...(a.consultation?.toObject?.() || {}), ...data, updatedAt: new Date() };
  await a.save();
  const full = await loadFull(id);
  emitToUser(asId(full.patient), 'appointment:updated', { id: a._id, status: a.status });
  return full;
}

/* ---------------------------------- queries ---------------------------------- */
export async function getForUser(actor, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Appointment not found');
  const a = await Appointment.findById(id).populate([...POPULATE_FULL, { path: 'prescription' }]);
  if (!a) throw ApiError.notFound('Appointment not found');
  await assertAccess(actor, a);
  return a;
}

export async function listForPatient(userId, { tab = 'upcoming', cursor, limit }) {
  const base = { patient: userId };
  if (tab === 'upcoming') {
    const items = await Appointment.find({ ...base, status: { $in: APPT_ACTIVE }, endAt: { $gte: new Date() } })
      .sort({ startAt: 1 }).limit(50).populate(POPULATE_FULL.slice(1)).lean();
    return { items, nextCursor: null, hasMore: false };
  }
  return cursorPaginate(
    Appointment,
    { ...base, $or: [{ status: { $in: [S.COMPLETED, S.CANCELLED, S.NO_SHOW, S.EXPIRED] } }, { endAt: { $lt: new Date() } }] },
    { cursor, limit, populate: POPULATE_FULL.slice(1) },
  );
}

export async function listForDoctor(doctorUserId, { date, status, from, to }) {
  const q = { doctorUser: doctorUserId, status: { $nin: [S.EXPIRED] } };
  if (date) q.date = date;
  if (from || to) q.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (status) q.status = status;
  return Appointment.find(q).sort({ startAt: 1 }).limit(300)
    .populate([{ path: 'patient', select: 'name phone gender dob bloodGroup allergies chronicConditions avatar' }, { path: 'department', select: 'name' }]).lean();
}

export async function joinInfo(actor, id) {
  const a = await getForUser(actor, id);
  if (a.mode !== APPT_MODE.VIDEO || !a.meetingUrl) throw ApiError.badRequest('This is not a video consultation');
  if (![S.BOOKED, S.CHECKED_IN, S.IN_CONSULTATION].includes(a.status)) throw ApiError.conflict('Meeting is not active');
  const opensAt = a.startAt.getTime() - 10 * 60_000;
  const closesAt = a.endAt.getTime() + 60 * 60_000;
  const now = Date.now();
  if (now < opensAt) throw ApiError.conflict(`Meeting opens at ${formatIST(new Date(opensAt))}`, 'MEETING_NOT_OPEN');
  if (now > closesAt) throw ApiError.conflict('Meeting window has ended', 'MEETING_CLOSED');
  return { url: a.meetingUrl, room: a.meetingRoom };
}

export async function reviewAppointment(user, id, { rating, comment }) {
  const a = await Appointment.findOne({ _id: id, patient: user._id });
  if (!a) throw ApiError.notFound('Appointment not found');
  if (a.status !== S.COMPLETED) throw ApiError.conflict('You can review after the consultation is completed');
  try {
    await Review.create({ appointment: a._id, patient: user._id, doctor: a.doctor, rating, comment });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('You already reviewed this consultation');
    throw e;
  }
  a.review = { rating, comment, at: new Date() };
  await a.save();
  await DoctorProfile.updateOne({ _id: a.doctor }, [
    {
      $set: {
        'rating.avg': { $round: [{ $divide: [{ $add: [{ $multiply: ['$rating.avg', '$rating.count'] }, rating] }, { $add: ['$rating.count', 1] }] }, 2] },
        'rating.count': { $add: ['$rating.count', 1] },
      },
    },
  ]);
  return a;
}

/* ---------------------------------- background ---------------------------------- */
export async function sweepExpiredHolds() {
  const stale = await Appointment.find({ status: S.PENDING_PAYMENT, holdExpiresAt: { $lt: new Date() } }).select('doctor date').limit(500).lean();
  if (!stale.length) return 0;
  await Appointment.updateMany(
    { _id: { $in: stale.map((s) => s._id) }, status: S.PENDING_PAYMENT },
    { $set: { status: S.EXPIRED, slotLocked: false }, $unset: { holdExpiresAt: 1 }, $push: { history: { at: new Date(), action: 'expired', byRole: 'system' } } },
  );
  for (const s of stale) emit(`slots:${s.doctor}`, 'slots:changed', { doctorId: String(s.doctor), date: s.date });
  return stale.length;
}

const WINDOWS = [
  { key: 'dayBefore', label: 'tomorrow', fromMin: 23 * 60, toMin: 24 * 60 },
  { key: 'hourBefore', label: 'in about an hour', fromMin: 0, toMin: 60 },
];

/** Reminders only go to channels the patient opted in to for that booking. */
export async function sendAppointmentReminders() {
  let sent = 0;
  for (const w of WINDOWS) {
    const from = new Date(Date.now() + w.fromMin * 60_000);
    const to = new Date(Date.now() + w.toMin * 60_000);
    const due = await Appointment.find({ status: S.BOOKED, startAt: { $gt: from, $lte: to }, [`reminders.${w.key}`]: { $exists: false } }).select('_id').limit(500).lean();
    for (const d of due) {
      const claimed = await Appointment.findOneAndUpdate({ _id: d._id, status: S.BOOKED, [`reminders.${w.key}`]: { $exists: false } }, { $set: { [`reminders.${w.key}`]: new Date() } });
      if (!claimed) continue;
      const a = await loadFull(d._id);
      await notifyPatient(a, T.APPT_REMINDER, 'Appointment reminder', `${vars(a).doctorName} ${w.label} · ${vars(a).when}`, 'reminder', { leadLabel: w.label });
      sent += 1;
    }
  }
  return sent;
}

export async function markNoShows() {
  const cutoff = new Date(Date.now() - 30 * 60_000);
  const res = await Appointment.updateMany(
    { status: { $in: [S.BOOKED, S.CHECKED_IN] }, endAt: { $lt: cutoff } },
    { $set: { status: S.NO_SHOW, slotLocked: false }, $push: { history: { at: new Date(), action: 'status', to: S.NO_SHOW, byRole: 'system' } } },
  );
  return res.modifiedCount;
}

/** Patient's past consultations with this doctor (shown to the doctor inside the consult screen). */
export async function patientHistoryForDoctor(doctorUserId, patientId) {
  return Appointment.find({ doctorUser: doctorUserId, patient: patientId, status: S.COMPLETED })
    .sort({ startAt: -1 }).limit(10).select('code date consultation prescription mode').lean();
}

