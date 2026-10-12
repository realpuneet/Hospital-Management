import mongoose from 'mongoose';
import { MEAL_TIMING } from '../utils/constants.js';

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine' }, // optional link to catalogue (enables 1-tap ordering)
    name: { type: String, required: true, trim: true },
    strength: String,
    form: String,
    /** "1-0-1" morning-noon-night */
    dosage: { type: String, default: '1-0-1' },
    timings: [{ type: String }], // explicit reminder times 'HH:mm'
    meal: { type: String, enum: MEAL_TIMING, default: 'after_food' },
    durationDays: { type: Number, default: 5, min: 1 },
    quantity: { type: Number, default: 1, min: 1 },
    instructions: String,
  },
  { _id: true },
);

const schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    forMemberName: String,
    doctor: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    doctorUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    diagnosis: String,
    items: [itemSchema],
    tests: [String],
    advice: String,
    followUpDate: String,
    validTill: Date,
    version: { type: Number, default: 1 },
    issuedAt: { type: Date, default: Date.now },
    isFinal: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ patient: 1, issuedAt: -1 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Prescription = mongoose.models.Prescription || mongoose.model('Prescription', schema);
