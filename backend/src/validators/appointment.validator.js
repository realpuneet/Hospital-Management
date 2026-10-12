import { z } from 'zod';
import { APPT_MODES, APPT_STATUS_LIST } from '../utils/constants.js';
import { dateStr, objectId, timeStr, cursorQuery } from './common.js';

export const slotsQuery = z.object({ date: dateStr.optional(), mode: z.enum(APPT_MODES).optional(), days: z.coerce.number().int().min(1).max(60).optional() });

export const book = z.object({
  doctorId: objectId,
  date: dateStr,
  time: timeStr,
  mode: z.enum(APPT_MODES),
  payMode: z.enum(['online', 'at_clinic']).optional(),
  memberId: objectId.optional(),
  reason: z.string().trim().max(500).optional(),
  symptoms: z.array(z.string().trim().max(60)).max(12).optional(),
  attachments: z.array(z.object({ url: z.string().url().max(500), name: z.string().max(120).optional() })).max(5).optional(),
  /** OPTIONAL channels – patient's choice for this booking */
  notify: z.object({ email: z.boolean().optional(), whatsapp: z.boolean().optional() }).optional(),
});

export const reschedule = z.object({ date: dateStr, time: timeStr, mode: z.enum(APPT_MODES).optional(), reason: z.string().trim().max(300).optional() });
export const cancel = z.object({ reason: z.string().trim().max(300).optional() });
export const review = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(600).optional() });
export const listQuery = cursorQuery.extend({ tab: z.enum(['upcoming', 'past']).optional() });

export const doctorList = z.object({ date: dateStr.optional(), from: dateStr.optional(), to: dateStr.optional(), status: z.enum(APPT_STATUS_LIST).optional() });
export const statusChange = z.object({ status: z.enum(APPT_STATUS_LIST), note: z.string().trim().max(300).optional() });

const vitals = z
  .object({
    bp: z.string().max(12).optional(),
    pulse: z.coerce.number().min(20).max(250).optional(),
    temperature: z.coerce.number().min(30).max(45).optional(),
    spo2: z.coerce.number().min(50).max(100).optional(),
    weightKg: z.coerce.number().min(1).max(400).optional(),
    heightCm: z.coerce.number().min(20).max(260).optional(),
    sugar: z.string().max(20).optional(),
  })
  .partial();

export const consultation = z.object({
  chiefComplaint: z.string().trim().max(500).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(5000).optional(),
  treatmentPlan: z.string().trim().max(2000).optional(),
  advice: z.string().trim().max(2000).optional(),
  tests: z.array(z.string().trim().max(120)).max(20).optional(),
  vitals: vitals.optional(),
  followUpDate: dateStr.optional(),
});
