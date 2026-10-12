import { z } from 'zod';
import { APPT_MODES } from '../utils/constants.js';
import { dateStr, emptyToUndef, objectId, phone, timeStr } from './common.js';

const range = z.object({ start: timeStr, end: timeStr }).refine((r) => r.start < r.end, 'End must be after start');
const day = z.object({ day: z.coerce.number().int().min(0).max(6), ranges: z.array(range).max(6), modes: z.array(z.enum(APPT_MODES)).optional() });

export const listQuery = z.object({
  q: z.string().trim().max(60).optional(),
  department: objectId.optional(),
  mode: z.enum(APPT_MODES).optional(),
  language: z.string().max(30).optional(),
  maxFee: z.coerce.number().min(0).optional(),
  sort: z.enum(['rating', 'experience', 'fee', 'name']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

export const schedule = z.object({
  weekly: z.array(day).max(7).optional(),
  slotMinutes: z.coerce.number().int().min(5).max(120).optional(),
  modes: z.array(z.enum(APPT_MODES)).min(1).optional(),
  isAcceptingBookings: z.boolean().optional(),
  room: z.string().trim().max(60).optional(),
});

export const leave = z.object({
  date: dateStr,
  reason: z.string().trim().max(200).optional(),
  fullDay: z.boolean().optional(),
  ranges: z.array(range).max(4).optional(),
  force: z.boolean().optional(),
});

export const myProfile = z.object({
  bio: z.string().trim().max(2000).optional(),
  languages: z.array(z.string().trim().max(30)).max(10).optional(),
  qualifications: z.array(z.string().trim().max(80)).max(10).optional(),
  conditionsTreated: z.array(z.string().trim().max(60)).max(30).optional(),
  avatar: z.string().max(500).nullable().optional(),
});

const fees = z.object({ in_person: z.coerce.number().min(0).max(100000).optional(), video: z.coerce.number().min(0).max(100000).optional() });

export const adminCreate = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: emptyToUndef(phone),
  password: z.string().min(8).max(72),
  department: objectId,
  specialization: z.string().trim().max(100).optional(),
  qualifications: z.array(z.string().trim().max(80)).max(10).optional(),
  registrationNo: z.string().trim().max(40).optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  bio: z.string().trim().max(2000).optional(),
  languages: z.array(z.string().trim().max(30)).max(10).optional(),
  conditionsTreated: z.array(z.string().trim().max(60)).max(30).optional(),
  fees: fees.optional(),
  modes: z.array(z.enum(APPT_MODES)).min(1).optional(),
  slotMinutes: z.coerce.number().int().min(5).max(120).optional(),
  room: z.string().trim().max(60).optional(),
  avatar: z.string().max(500).nullable().optional(),
  weekly: z.array(day).max(7).optional(),
});
export const adminUpdate = adminCreate.omit({ email: true, password: true, phone: true }).partial().extend({ isActive: z.boolean().optional(), isAcceptingBookings: z.boolean().optional() });

export const departmentBody = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(400).optional(),
  icon: z.string().trim().max(40).optional(),
  image: z.string().max(500).nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const departmentUpdate = departmentBody.partial();
