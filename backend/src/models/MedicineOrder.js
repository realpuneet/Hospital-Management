import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_STATUS_LIST, PAY_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    medicine: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    name: String,
    price: Number,
    qty: { type: Number, min: 1, required: true },
    requiresPrescription: Boolean,
  },
  { _id: false },
);

const schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prescription: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    address: {
      name: String,
      phone: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      location: { lat: Number, lng: Number },
    },
    subtotal: Number,
    gst: Number,
    deliveryFee: Number,
    total: Number,
    payMethod: { type: String, enum: ['online', 'cod'], default: 'online' },
    paymentStatus: { type: String, enum: Object.values(PAY_STATUS), default: PAY_STATUS.NONE },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    status: { type: String, enum: ORDER_STATUS_LIST, default: ORDER_STATUS.PENDING_PAYMENT, index: true },
    stockReserved: { type: Boolean, default: true },
    note: String,

    rider: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    riderLocation: { lat: Number, lng: Number, at: Date },
    etaMinutes: Number,
    deliveredAt: Date,
    cancelReason: String,
    history: [{ at: { type: Date, default: Date.now }, status: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, note: String, _id: false }],
  },
  { timestamps: true },
);
schema.index({ status: 1, createdAt: -1 });
schema.index({ rider: 1, status: 1 });


export const MedicineOrder = mongoose.models.MedicineOrder || mongoose.model('MedicineOrder', schema);
