import { NotificationLog } from '../models/NotificationLog.js';
import { sendEmail } from '../integrations/email.js';
import { sendWhatsApp } from '../integrations/whatsapp.js';
import { renderTemplate } from '../integrations/templates.js';
import { logger } from '../utils/logger.js';

/** Deliver one email / WhatsApp message and record the outcome. Throws on failure so BullMQ retries. */
async function deliver({ logId, channel, to, type, vars }) {
  const log = await NotificationLog.findById(logId);
  if (!log) return;
  if (log.status === 'sent' || log.status === 'dry_run') return; // idempotent on retry
  const tpl = renderTemplate(type, vars);
  try {
    log.attempts += 1;
    const res =
      channel === 'email'
        ? await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text })
        : await sendWhatsApp({ to, template: tpl.waTemplate, params: tpl.waParams, text: tpl.text });
    log.status = res.status;
    log.provider = res.provider;
    log.providerId = res.providerId;
    log.error = undefined;
    await log.save();
  } catch (e) {
    log.status = 'failed';
    log.error = String(e.message).slice(0, 300);
    await log.save();
    logger.warn({ channel, err: e.message }, 'notification delivery failed');
    throw e;
  }
}

/** Minute tick: expire slot holds, send reminders, mark no-shows. Safe to run on multiple workers. */
async function tick() {
  const [{ sweepExpiredHolds, sendAppointmentReminders, markNoShows }, { sendMedicationReminders }, { sweepUnpaidOrders }] = await Promise.all([
    import('../services/appointment.service.js'),
    import('../services/medication.service.js'),
    import('../services/order.service.js'),
  ]);
  const results = await Promise.allSettled([sweepExpiredHolds(), sendAppointmentReminders(), markNoShows(), sendMedicationReminders(), sweepUnpaidOrders()]);
  results.filter((r) => r.status === 'rejected').forEach((r) => logger.error({ err: r.reason?.message }, 'tick task failed'));
}

export const handlers = { deliver, tick };
