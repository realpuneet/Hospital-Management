import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    generic: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    form: { type: String, trim: true }, // tablet, syrup, injection
    strength: { type: String, trim: true },
    packSize: { type: String, trim: true },
    description: { type: String, trim: true },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockAt: { type: Number, default: 10 },
    requiresPrescription: { type: Boolean, default: false, index: true },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
schema.index({ name: 'text', generic: 'text', category: 'text' });
schema.index({ isActive: 1, category: 1, price: 1 });
schema.index({ stock: 1 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', schema);
