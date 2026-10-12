import { z } from 'zod';
import { ROLE_LIST, APPT_STATUS_LIST } from '../utils/constants.js';
import { dateStr, emptyToUndef, objectId, phone } from './common.js';

export const userList = z.object({ role: z.enum(ROLE_LIST).optional(), q: z.string().max(60).optional(), isActive: z.enum(['true', 'false']).optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
export const createStaff = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: emptyToUndef(phone),
  password: z.string().min(8).max(72),
  role: z.enum(['pharmacist', 'rider', 'admin']),
});
export const setActive = z.object({ isActive: z.boolean() });
export const apptList = z.object({ status: z.enum(APPT_STATUS_LIST).optional(), date: dateStr.optional(), doctor: objectId.optional(), q: z.string().max(30).optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
export const logList = z.object({ channel: z.enum(['email', 'whatsapp']).optional(), status: z.enum(['queued', 'sent', 'failed', 'dry_run']).optional(), page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() });
export const settings = z
  .object({
    hospitalName: z.string().max(80),
    helpline: z.string().max(30),
    address: z.string().max(300),
    slotHoldMinutes: z.coerce.number().int().min(3).max(60),
    bookingWindowDays: z.coerce.number().int().min(1).max(180),
    minLeadMinutes: z.coerce.number().int().min(0).max(1440),
    freeCancelHours: z.coerce.number().int().min(0).max(168),
    maxReschedules: z.coerce.number().int().min(0).max(10),
    deliveryFee: z.coerce.number().min(0),
    freeDeliveryAbove: z.coerce.number().min(0),
    gstPercent: z.coerce.number().min(0).max(40),
    paymentRequired: z.boolean(),
    codEnabled: z.boolean(),
  })
  .partial();
