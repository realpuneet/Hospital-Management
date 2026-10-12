import mongoose from 'mongoose';

const { Schema } = mongoose;

/** A patient's active medicine course (created from a prescription or manually). Drives dose reminders. */
const schema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    name: { type: String, required: true, trim: true },
    dosage: String,
    meal: String,
    instructions: String,
    times: [{ type: String }], // 'HH:mm' (IST)
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    remindersOn: { type: Boolean, default: true },
    /** doses taken: key "YYYY-MM-DD@HH:mm" */
    taken: [{ key: String, at: Date }],
    lastReminderKey: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ isActive: 1, remindersOn: 1, endDate: 1 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Medication = mongoose.models.Medication || mongoose.model('Medication', schema);
