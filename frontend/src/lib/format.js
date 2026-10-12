const TZ = 'Asia/Kolkata';

export const inr = (n) => (n == null ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n));
export const num = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0);

const fmt = (opts) => (d) => (d ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(new Date(d)) : '');
export const dateShort = fmt({ day: '2-digit', month: 'short' });
export const dateLong = fmt({ weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
export const timeOnly = fmt({ hour: '2-digit', minute: '2-digit', hour12: true });
export const dateTime = fmt({ weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
export const dateTimeFull = fmt({ day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

/** 'YYYY-MM-DD' of an instant in IST */
export const istDate = (d = new Date()) => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 10);
export const addDaysStr = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const weekdayName = (s, long = false) =>
  new Intl.DateTimeFormat('en-IN', { weekday: long ? 'long' : 'short', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`));
export const dayNum = (s) => Number(s.slice(8, 10));
export const monthShort = (s) => new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`));
export const prettyDate = (s) => (s ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`)) : '');

export const to12h = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const ageFrom = (dob) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null);
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
export const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const untilLabel = (d) => {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  if (m < 1440) return `in ${Math.floor(m / 60)}h ${m % 60}m`;
  return `in ${Math.floor(m / 1440)} day${m >= 2880 ? 's' : ''}`;
};

export const STATUS_META = {
  pending_payment: { label: 'Awaiting payment', tone: 'amber' },
  booked: { label: 'Confirmed', tone: 'brand' },
  checked_in: { label: 'Checked in', tone: 'blue' },
  in_consultation: { label: 'In consultation', tone: 'blue' },
  completed: { label: 'Completed', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  no_show: { label: 'No show', tone: 'gray' },
  expired: { label: 'Expired', tone: 'gray' },
  placed: { label: 'Placed', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'brand' },
  packed: { label: 'Packed', tone: 'blue' },
  out_for_delivery: { label: 'Out for delivery', tone: 'blue' },
  delivered: { label: 'Delivered', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
};
export const MEAL_LABEL = { before_food: 'Before food', after_food: 'After food', with_food: 'With food', any: 'Any time' };
export const MODE_LABEL = { in_person: 'In-clinic', video: 'Video' };
