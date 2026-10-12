import { Setting } from '../models/Setting.js';
import { env } from '../config/env.js';
import { cacheGetOrSet, invalidateNamespace } from '../utils/cache.js';

/** Defaults come from env; admins can override a safe subset at runtime. */
export const SETTING_DEFAULTS = () => ({
  hospitalName: env.APP_NAME,
  helpline: '',
  address: '',
  slotHoldMinutes: env.SLOT_HOLD_MINUTES,
  bookingWindowDays: env.BOOKING_WINDOW_DAYS,
  minLeadMinutes: env.MIN_LEAD_MINUTES,
  freeCancelHours: env.FREE_CANCEL_HOURS,
  maxReschedules: env.MAX_RESCHEDULES,
  deliveryFee: env.DELIVERY_FEE,
  freeDeliveryAbove: env.FREE_DELIVERY_ABOVE,
  gstPercent: env.GST_PERCENT,
  paymentRequired: env.PAYMENT_REQUIRED,
  codEnabled: true,
});

export const getSettings = () =>
  cacheGetOrSet('settings', 'all', 300, async () => {
    const rows = await Setting.find().lean();
    return { ...SETTING_DEFAULTS(), ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  });

export async function updateSettings(patch) {
  const allowed = Object.keys(SETTING_DEFAULTS());
  const ops = Object.entries(patch)
    .filter(([k]) => allowed.includes(k))
    .map(([key, value]) => ({ updateOne: { filter: { key }, update: { $set: { value } }, upsert: true } }));
  if (ops.length) await Setting.bulkWrite(ops);
  await invalidateNamespace('settings');
  return getSettings();
}

export const publicSettings = async () => {
  const s = await getSettings();
  return {
    hospitalName: s.hospitalName,
    helpline: s.helpline,
    address: s.address,
    bookingWindowDays: s.bookingWindowDays,
    freeCancelHours: s.freeCancelHours,
    maxReschedules: s.maxReschedules,
    deliveryFee: s.deliveryFee,
    freeDeliveryAbove: s.freeDeliveryAbove,
    gstPercent: s.gstPercent,
    codEnabled: s.codEnabled,
    paymentRequired: s.paymentRequired,
  };
};
