import mongoose from 'mongoose';
import { APPT_MODES, APPT_STATUS, APPT_STATUS_LIST, PAY_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

const historySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    byRole: String,
    action: { type: String, required: true }, // created|paid|rescheduled|cancelled|status|note
    from: Schema.Types.Mixed,
    to: Schema.Types.Mixed,
    note: String,
  },
  { _id: false },
);

const vitalsSchema = new Schema(
  { bp: String, pulse: Number, temperature: Number, spo2: Number, weightKg: Number, heightCm: Number, sugar: String },
  { _id: false },
);

const schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    forMember: { memberId: Schema.Types.ObjectId, name: String, relation: String, age: Number, gender: String },
    doctor: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    doctorUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    mode: { type: String, enum: APPT_MODES, required: true },
    date: { type: String, required: true }, // IST YYYY-MM-DD
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    queueNo: Number,
    status: { type: String, enum: APPT_STATUS_LIST, default: APPT_STATUS.PENDING_PAYMENT, index: true },
    /** true while the appointment occupies its slot -> partial unique index prevents double booking */
    slotLocked: { type: Boolean, default: true },
    holdExpiresAt: Date,

    reason: { type: String, trim: true, maxlength: 500 },
    symptoms: [{ type: String, trim: true }],
    attachments: [{ url: String, name: String }],

    fee: { type: Number, default: 0 },
    payMode: { type: String, enum: ['online', 'at_clinic', 'free'], default: 'online' },
    paymentStatus: { type: String, enum: Object.values(PAY_STATUS), default: PAY_STATUS.NONE },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },

    meetingUrl: String,
    meetingRoom: String,

    /** consent for optional channels on THIS booking (falls back to user prefs) */
    notify: { email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },

    rescheduleCount: { type: Number, default: 0 },
    rescheduledFrom: [{ startAt: Date, endAt: Date, at: Date }],
    cancelledBy: { type: String },
    cancelReason: String,
    cancelledAt: Date,
    checkedInAt: Date,
    startedAt: Date,
    completedAt: Date,

    consultation: {
      chiefComplaint: String,
      diagnosis: String,
      notes: String,
      treatmentPlan: String,
      advice: String,
      tests: [String],
      vitals: vitalsSchema,
      followUpDate: String,
      updatedAt: Date,
    },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription' },

    review: { rating: { type: Number, min: 1, max: 5 }, comment: String, at: Date },

    reminders: { dayBefore: Date, hourBefore: Date },
    history: [historySchema],
  },
  { timestamps: true },
);

// A doctor can have only ONE slot-occupying appointment per start time (race safe double-booking guard).
schema.index({ doctor: 1, startAt: 1 }, { unique: true, partialFilterExpression: { slotLocked: true } });
schema.index({ doctor: 1, date: 1, status: 1 });
schema.index({ doctorUser: 1, date: 1, startAt: 1 });
schema.index({ patient: 1, startAt: -1 });
schema.index({ status: 1, holdExpiresAt: 1 });
schema.index({ status: 1, startAt: 1 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', schema);
