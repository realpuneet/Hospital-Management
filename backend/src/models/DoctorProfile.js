import mongoose from 'mongoose';
import { APPT_MODES } from '../utils/constants.js';

const { Schema } = mongoose;

const rangeSchema = new Schema({ start: { type: String, required: true }, end: { type: String, required: true } }, { _id: false });
const daySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    ranges: [rangeSchema],
    modes: [{ type: String, enum: APPT_MODES }], // empty => all enabled modes
  },
  { _id: false },
);
const leaveSchema = new Schema(
  { date: { type: String, required: true }, reason: { type: String, trim: true }, fullDay: { type: Boolean, default: true }, ranges: [rangeSchema] },
  { _id: false },
);

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: null },
    slug: { type: String, required: true, unique: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    specialization: { type: String, trim: true },
    qualifications: [{ type: String, trim: true }],
    registrationNo: { type: String, trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    bio: { type: String, trim: true, maxlength: 2000 },
    languages: [{ type: String, trim: true }],
    conditionsTreated: [{ type: String, trim: true }],
    fees: {
      in_person: { type: Number, default: 0, min: 0 },
      video: { type: Number, default: 0, min: 0 },
    },
    modes: { type: [{ type: String, enum: APPT_MODES }], default: ['in_person'] },
    slotMinutes: { type: Number, default: 15, min: 5, max: 120 },
    room: { type: String, trim: true }, // consulting room / floor
    weekly: [daySchema], // route timing => weekly availability
    leaves: [leaveSchema],
    rating: { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    isAcceptingBookings: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

schema.index({ department: 1, isActive: 1, 'rating.avg': -1 });
schema.index({ name: 'text', specialization: 'text', bio: 'text', conditionsTreated: 'text' });

export const DoctorProfile = mongoose.models.DoctorProfile || mongoose.model('DoctorProfile', schema);
