import crypto from 'crypto';

/* ---------------------------------------------------------------------------
 * IST helpers. India has no DST, so a fixed +05:30 offset is exact and keeps all
 * slot maths deterministic regardless of the server timezone.
 * ------------------------------------------------------------------------- */
export const IST_OFFSET_MIN = 330;
const MS_MIN = 60_000;

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of the given instant in IST. */
export function dateStr(d = new Date()) {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * MS_MIN);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
/** 'HH:mm' of the given instant in IST. */
export function timeStr(d = new Date()) {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * MS_MIN);
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}
export const todayStr = () => dateStr(new Date());

/** UTC Date for an IST wall-clock date + time. */
export function istToDate(date, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * MS_MIN);
}
export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
/** 0 (Sun) – 6 (Sat) for 'YYYY-MM-DD' */
export function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMinutes = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const isValidDateStr = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s; // rejects 2026-02-30
};

/**
 * Expand working ranges into fixed length slots.
 * ranges: [{start:'09:00', end:'13:00'}]  -> slots of `slotMinutes`.
 * Overlapping / unsorted ranges are merged first so slots never duplicate.
 */
export function generateSlots(date, ranges = [], slotMinutes = 15) {
  if (!ranges.length || slotMinutes < 5) return [];
  const merged = ranges
    .map((r) => [toMinutes(r.start), toMinutes(r.end)])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0])
    .reduce((acc, cur) => {
      const last = acc[acc.length - 1];
      if (last && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
      else acc.push([...cur]);
      return acc;
    }, []);
  const out = [];
  for (const [s, e] of merged) {
    for (let t = s; t + slotMinutes <= e; t += slotMinutes) {
      out.push({
        time: fromMinutes(t),
        startAt: istToDate(date, fromMinutes(t)),
        endAt: istToDate(date, fromMinutes(t + slotMinutes)),
      });
    }
  }
  return out;
}

/* ------------------------------ misc helpers ------------------------------ */
export const randomDigits = (n = 6) => String(crypto.randomInt(0, 10 ** n)).padStart(n, '0');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const genCode = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const slugify = (s = '') =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Normalise an Indian-style phone to E.164 digits without '+', e.g. 9876543210 -> 919876543210 */
export function normalizePhone(phone, cc = process.env.DEFAULT_COUNTRY_CODE || '91') {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.length === 10) d = cc + d;
  if (d.length === 11 && d.startsWith('0')) d = cc + d.slice(1);
  return d.length >= 11 && d.length <= 15 ? d : null;
}
export const maskPhone = (p = '') => (p.length > 4 ? `${'*'.repeat(p.length - 4)}${p.slice(-4)}` : p);
export const maskEmail = (e = '') => e.replace(/(^.).*(@.*$)/, '$1***$2');

export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Human date for messages, e.g. "Sat, 12 Oct 2026, 10:30 AM" (IST). */
export function formatIST(d) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}
