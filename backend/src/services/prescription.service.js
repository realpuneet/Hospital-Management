import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { Prescription } from '../models/Prescription.js';
import { Medicine } from '../models/Medicine.js';
import { ApiError } from '../utils/ApiError.js';
import { APPT_STATUS as S, NOTIFY_TYPE as T, ROLES } from '../utils/constants.js';
import { genCode } from '../utils/helpers.js';
import { cursorPaginate } from '../utils/pagination.js';
import { emitToUser } from '../sockets/index.js';
import { notifyUser } from './notification.service.js';
import { syncFromPrescription } from './medication.service.js';
import { User } from '../models/User.js';

const POP = [
  { path: 'doctor', select: 'slug specialization qualifications registrationNo room' },
  { path: 'doctorUser', select: 'name avatar' },
  { path: 'patient', select: 'name gender dob phone' },
  { path: 'items.medicine', select: 'name price stock requiresPrescription image isActive' },
];

/** Doctor writes / updates the prescription for an appointment (one per appointment, versioned). */
export async function upsertForAppointment(doctorUser, appointmentId, data) {
  const a = await Appointment.findById(appointmentId).populate('doctor', 'slug');
  if (!a || String(a.doctorUser) !== String(doctorUser._id)) throw ApiError.notFound('Appointment not found');
  if (![S.IN_CONSULTATION, S.COMPLETED, S.CHECKED_IN, S.BOOKED].includes(a.status)) throw ApiError.conflict('Prescription cannot be written for this appointment');

  // link catalogue medicines, fill names
  const ids = data.items.map((i) => i.medicine).filter((x) => x && mongoose.isValidObjectId(x));
  const meds = ids.length ? await Medicine.find({ _id: { $in: ids } }).select('name strength form').lean() : [];
  const byId = new Map(meds.map((m) => [String(m._id), m]));
  const items = data.items.map((i) => {
    const m = i.medicine ? byId.get(String(i.medicine)) : null;
    return { ...i, medicine: m ? m._id : undefined, name: i.name || m?.name, strength: i.strength || m?.strength, form: i.form || m?.form };
  });

  const existing = await Prescription.findOne({ appointment: a._id });
  const fields = {
    diagnosis: data.diagnosis ?? a.consultation?.diagnosis,
    items,
    tests: data.tests || [],
    advice: data.advice,
    followUpDate: data.followUpDate,
    validTill: new Date(Date.now() + (data.validDays || 30) * 86400_000),
  };
  let rx;
  const isNew = !existing;
  if (existing) {
    Object.assign(existing, fields, { version: existing.version + 1, issuedAt: new Date() });
    rx = await existing.save();
  } else {
    rx = await Prescription.create({
      code: genCode('RX'),
      appointment: a._id,
      patient: a.patient,
      forMemberName: a.forMember?.name,
      doctor: a.doctor._id,
      doctorUser: a.doctorUser,
      ...fields,
    });
    await Appointment.updateOne({ _id: a._id }, { prescription: rx._id });
  }
  await syncFromPrescription(rx);

  const [patient, docUser] = await Promise.all([User.findById(a.patient).lean(), User.findById(a.doctorUser).select('name').lean()]);
  emitToUser(a.patient, 'prescription:ready', { id: rx._id, code: rx.code, appointmentId: a._id });
  await notifyUser({
    user: patient,
    type: T.RX_READY,
    title: isNew ? 'Your prescription is ready' : 'Your prescription was updated',
    body: `${rx.code} · Dr. ${docUser.name}`,
    kind: 'confirmation',
    email: a.notify?.email,
    whatsapp: a.notify?.whatsapp,
    data: { prescriptionId: rx._id, appointmentId: a._id },
    vars: { doctorName: `Dr. ${docUser.name}`, code: rx.code, diagnosis: rx.diagnosis, link: `/prescriptions/${rx._id}` },
    ref: { kind: 'prescription', id: rx._id },
  });
  return Prescription.findById(rx._id).populate(POP);
}

export async function getPrescription(actor, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Prescription not found');
  const rx = await Prescription.findById(id).populate(POP);
  if (!rx) throw ApiError.notFound('Prescription not found');
  const own = String(rx.patient._id) === String(actor._id) || String(rx.doctorUser._id) === String(actor._id);
  if (!own && ![ROLES.ADMIN, ROLES.PHARMACIST].includes(actor.role)) throw ApiError.notFound('Prescription not found');
  return rx;
}

export const listForPatient = (userId, { cursor, limit }) =>
  cursorPaginate(Prescription, { patient: userId }, { cursor, limit, populate: POP.slice(0, 2) });

export const listForDoctor = (doctorUserId, { cursor, limit }) =>
  cursorPaginate(Prescription, { doctorUser: doctorUserId }, { cursor, limit, populate: [POP[2]] });

/** Valid (non expired) prescriptions that include a given medicine – used to gate Rx-only orders. */
export function prescriptionCovers(rx, medicine) {
  if (!rx || rx.validTill < new Date()) return false;
  const name = medicine.name.toLowerCase();
  return rx.items.some((i) => (i.medicine && String(i.medicine) === String(medicine._id)) || i.name?.toLowerCase() === name);
}
