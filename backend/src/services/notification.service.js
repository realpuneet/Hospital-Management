import { Notification } from '../models/Notification.js';
import { NotificationLog } from '../models/NotificationLog.js';
import { User } from '../models/User.js';
import { enqueue, QUEUES } from '../jobs/queues.js';
import { emitToUser } from '../sockets/index.js';
import { normalizePhone } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/** Which preference flag governs each kind of message. */
const PREF_KEY = {
  confirmation: { email: 'emailConfirmations', whatsapp: 'whatsappConfirmations' },
  reminder: { email: 'emailReminders', whatsapp: 'whatsappReminders' },
  medicine: { email: null, whatsapp: null }, // medicine reminders: in-app + opt-in channels below
  order: { email: 'orderUpdates', whatsapp: 'whatsappConfirmations' },
  system: { email: 'emailConfirmations', whatsapp: null },
};

/**
 * Decide whether an OPTIONAL channel (email / WhatsApp) should be used.
 * explicit boolean (e.g. per-booking checkbox) wins; otherwise the user's saved preference decides.
 */
export function channelWanted(user, kind, channel, explicit) {
  if (typeof explicit === 'boolean') return explicit;
  const key = PREF_KEY[kind]?.[channel];
  if (kind === 'medicine') return channel === 'whatsapp' ? Boolean(user.prefs?.whatsappReminders) : Boolean(user.prefs?.emailReminders);
  return key ? Boolean(user.prefs?.[key]) : false;
}

/**
 * Notify a user:
 *  1. in-app notification (always) + realtime socket push
 *  2. optional email / WhatsApp (queued with retries, audited in NotificationLog)
 *
 * opts: { userId|user, type, title, body, data, kind, email?: bool, whatsapp?: bool, vars, ref:{kind,id}, inApp?: bool }
 */
export async function notifyUser(opts) {
  const { type, title, body, data, kind = 'system', vars = {}, ref, inApp = true } = opts;
  try {
    const user = opts.user || (await User.findById(opts.userId).lean());
    if (!user) return null;

    let notif = null;
    if (inApp) {
      notif = await Notification.create({ user: user._id, type, title, body, data });
      emitToUser(user._id, 'notification:new', notif.toJSON());
    }

    const wantEmail = Boolean(user.email) && channelWanted(user, kind, 'email', opts.email);
    const waNumber = normalizePhone(user.prefs?.whatsappNumber || user.phone);
    const wantWa = Boolean(waNumber) && channelWanted(user, kind, 'whatsapp', opts.whatsapp);

    const common = { patientName: user.name, title, body, ...vars };
    const jobs = [];
    if (wantEmail) jobs.push({ channel: 'email', to: user.email });
    if (wantWa) jobs.push({ channel: 'whatsapp', to: waNumber });

    for (const j of jobs) {
      const log = await NotificationLog.create({ user: user._id, channel: j.channel, type, to: j.to, ref, status: 'queued' });
      await enqueue(QUEUES.NOTIFY, 'deliver', { logId: String(log._id), channel: j.channel, to: j.to, type, vars: common });
    }
    return { notification: notif, channels: jobs.map((j) => j.channel) };
  } catch (e) {
    // notifications must never break the business flow
    logger.error({ err: e.message, type: opts.type }, 'notifyUser failed');
    return null;
  }
}

export async function listNotifications(userId, { cursor, limit = 20 } = {}) {
  const { cursorPaginate } = await import('../utils/pagination.js');
  const res = await cursorPaginate(Notification, { user: userId }, { cursor, limit });
  const unread = await Notification.countDocuments({ user: userId, readAt: { $exists: false } });
  return { ...res, unread };
}
export const markRead = (userId, id) =>
  id === 'all'
    ? Notification.updateMany({ user: userId, readAt: { $exists: false } }, { readAt: new Date() })
    : Notification.updateOne({ _id: id, user: userId }, { readAt: new Date() });
