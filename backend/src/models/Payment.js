import mongoose from 'mongoose';
import { PAY_PURPOSE } from '../utils/constants.js';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: Object.values(PAY_PURPOSE), required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true }, // INR rupees
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created', index: true },
    gateway: { type: String, default: 'razorpay' },
    providerOrderId: { type: String, index: true },
    providerPaymentId: { type: String, index: true, sparse: true },
    signature: String,
    refund: { id: String, amount: Number, at: Date, reason: String },
    dryRun: { type: Boolean, default: false },
    paidAt: Date,
  },
  { timestamps: true },
);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', schema);
