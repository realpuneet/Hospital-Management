import { z } from 'zod';
import { ORDER_STATUS_LIST } from '../utils/constants.js';
import { cursorQuery, emptyToUndef, lat, lng, objectId } from './common.js';
import { address } from './user.validator.js';

export const medicineList = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  rx: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', 'price', '-price']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
});

const cartItem = z.object({ medicineId: objectId, qty: z.coerce.number().int().min(1).max(10) });
export const quote = z.object({ items: z.array(cartItem).min(1).max(30) });
export const placeOrder = z
  .object({
    items: z.array(cartItem).min(1).max(30),
    addressId: objectId.optional(),
    address: address.optional(),
    prescriptionId: objectId.optional(),
    payMethod: z.enum(['online', 'cod']).default('online'),
    note: emptyToUndef(z.string().trim().max(300)),
  })
  .refine((v) => v.addressId || v.address, { message: 'Delivery address required', path: ['addressId'] });

export const orderList = cursorQuery;
export const cancel = z.object({ reason: z.string().trim().max(300).optional() });
export const staffStatus = z.object({ status: z.enum(ORDER_STATUS_LIST), note: z.string().trim().max(300).optional() });
export const assignRider = z.object({ riderId: objectId.optional() });
export const staffList = z.object({ status: z.enum(ORDER_STATUS_LIST).optional(), q: z.string().max(30).optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
export const riderAction = z.object({ action: z.enum(['pickup', 'deliver']), otp: z.string().regex(/^\d{4}$/).optional() });
export const location = z.object({ lat, lng });
export const availability = z.object({ online: z.boolean() });

export const medicineBody = z.object({
  name: z.string().trim().min(2).max(120),
  generic: z.string().trim().max(120).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  form: z.string().trim().max(40).optional(),
  strength: z.string().trim().max(40).optional(),
  packSize: z.string().trim().max(40).optional(),
  description: z.string().trim().max(1000).optional(),
  mrp: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockAt: z.coerce.number().int().min(0).optional(),
  requiresPrescription: z.boolean().optional(),
  image: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});
export const medicineUpdate = medicineBody.partial();
export const stockAdjust = z.object({ delta: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'Cannot be zero'), reason: z.string().max(200).optional() });
