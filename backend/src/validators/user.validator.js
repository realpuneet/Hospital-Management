import { z } from 'zod';
import { emptyToUndef, lat, lng, phone } from './common.js';

const nullableStr = (max = 300) => z.string().trim().max(max).nullable().optional();

export const updateProfile = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: emptyToUndef(z.string().trim().toLowerCase().email()),
  phone: emptyToUndef(phone),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.coerce.date().max(new Date()).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).nullable().optional(),
  allergies: z.array(z.string().trim().max(60)).max(20).optional(),
  chronicConditions: z.array(z.string().trim().max(60)).max(20).optional(),
  avatar: nullableStr(500),
});

export const prefs = z
  .object({
    emailConfirmations: z.boolean(),
    whatsappConfirmations: z.boolean(),
    emailReminders: z.boolean(),
    whatsappReminders: z.boolean(),
    medicineReminders: z.boolean(),
    orderUpdates: z.boolean(),
    whatsappNumber: emptyToUndef(phone),
    language: z.enum(['en', 'hi']),
  })
  .partial();

export const address = z.object({
  label: z.string().trim().max(30).optional(),
  name: z.string().trim().max(80).optional(),
  phone: emptyToUndef(phone),
  line1: z.string().trim().min(3).max(200),
  line2: emptyToUndef(z.string().trim().max(200)),
  city: z.string().trim().min(2).max(60),
  state: emptyToUndef(z.string().trim().max(60)),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter 6 digit pincode'),
  location: z.object({ lat, lng }).optional(),
  isDefault: z.boolean().optional(),
});
export const addressUpdate = address.partial();

export const member = z.object({
  name: z.string().trim().min(2).max(80),
  relation: z.string().trim().max(30).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.coerce.date().max(new Date()).optional(),
  phone: emptyToUndef(phone),
});
export const memberUpdate = member.partial();
