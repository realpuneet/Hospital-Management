import { z } from 'zod';
import { MEAL_TIMING } from '../utils/constants.js';
import { cursorQuery, dateStr, objectId, timeStr } from './common.js';

const item = z.object({
  medicine: objectId.optional(),
  name: z.string().trim().min(2).max(120),
  strength: z.string().trim().max(40).optional(),
  form: z.string().trim().max(40).optional(),
  dosage: z.string().trim().regex(/^\d(\.\d)?(-\d(\.\d)?){2,3}$/, 'Use pattern like 1-0-1').default('1-0-1'),
  timings: z.array(timeStr).max(6).optional(),
  meal: z.enum(MEAL_TIMING).default('after_food'),
  durationDays: z.coerce.number().int().min(1).max(365).default(5),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  instructions: z.string().trim().max(300).optional(),
});

export const upsert = z.object({
  diagnosis: z.string().trim().max(500).optional(),
  items: z.array(item).min(1, 'Add at least one medicine').max(25),
  tests: z.array(z.string().trim().max(120)).max(20).optional(),
  advice: z.string().trim().max(2000).optional(),
  followUpDate: dateStr.optional(),
  validDays: z.coerce.number().int().min(1).max(180).optional(),
});
export const listQuery = cursorQuery;

export const medicationCreate = z.object({
  name: z.string().trim().min(2).max(120),
  dosage: z.string().trim().max(20).optional(),
  meal: z.enum(MEAL_TIMING).optional(),
  instructions: z.string().trim().max(300).optional(),
  times: z.array(timeStr).max(6).optional(),
  startDate: dateStr.optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  remindersOn: z.boolean().optional(),
});
export const medicationUpdate = z.object({ remindersOn: z.boolean().optional(), times: z.array(timeStr).min(1).max(6).optional(), instructions: z.string().max(300).optional() });
export const doseBody = z.object({ key: z.string().regex(/^\d{4}-\d{2}-\d{2}@\d{2}:\d{2}$/), taken: z.boolean().default(true) });
