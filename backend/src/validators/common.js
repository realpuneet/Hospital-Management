import { z } from 'zod';
import { isValidDateStr } from '../utils/helpers.js';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine(isValidDateStr, 'Invalid calendar date');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');
export const phone = z.string().trim().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number');
export const idParam = z.object({ id: objectId });
export const emptyToUndef = (s) => z.preprocess((v) => (v === '' || v === null ? undefined : v), s.optional());
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).optional(), limit: z.coerce.number().int().min(1).max(100).optional() }).passthrough();
export const cursorQuery = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).optional() }).passthrough();
export const lat = z.coerce.number().min(-90).max(90);
export const lng = z.coerce.number().min(-180).max(180);
