import mongoose from 'mongoose';
import { ROLE_LIST, ROLES } from '../utils/constants.js';

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    label: { type: String, default: 'Home', trim: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, required: true, trim: true },
    location: { lat: Number, lng: Number },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const memberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, default: 'Other', trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    dob: Date,
    phone: String,
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLE_LIST, default: ROLES.PATIENT, index: true },
    avatar: { type: String, default: null },
    gender: { type: String, enum: ['male', 'female', 'other'], default: undefined },
    dob: Date,
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null], default: null },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    addresses: [addressSchema],
    familyMembers: [memberSchema],

    /** Notification opt-ins. Email / WhatsApp are OPTIONAL channels the patient chooses. */
    prefs: {
      emailConfirmations: { type: Boolean, default: true },
      whatsappConfirmations: { type: Boolean, default: false },
      emailReminders: { type: Boolean, default: true },
      whatsappReminders: { type: Boolean, default: false },
      medicineReminders: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      whatsappNumber: { type: String, trim: true },
      language: { type: String, default: 'en' },
    },

    /** Rider live state (role=rider) */
    rider: {
      online: { type: Boolean, default: false },
      location: { lat: Number, lng: Number, updatedAt: Date },
      activeOrders: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ name: 'text', email: 'text', phone: 'text' });
userSchema.index({ role: 1, isActive: 1, 'rider.online': 1 });

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_d, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    ret.id = ret._id;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
