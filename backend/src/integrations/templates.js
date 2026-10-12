import { env } from '../config/env.js';
import { NOTIFY_TYPE as T } from '../utils/constants.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout(title, bodyHtml, cta) {
  return `<!doctype html><html><body style="margin:0;background:#f1f6f9;font-family:Segoe UI,Arial,sans-serif;color:#0f2a3d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e1ebf0">
<tr><td style="background:#0e7c86;color:#fff;padding:20px 28px;font-size:20px;font-weight:700">${esc(env.APP_NAME)} <span style="font-weight:400;opacity:.85">Hospital</span></td></tr>
<tr><td style="padding:28px"><h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>${bodyHtml}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="background:#0e7c86;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:600">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#f7fafb;font-size:12px;color:#6b8394">You are receiving this because you opted in to notifications. Manage channels in Profile → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

const rows = (pairs) =>
  `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0">${pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 0;color:#6b8394;width:38%;border-bottom:1px solid #eef3f6">${esc(k)}</td><td style="padding:8px 0;font-weight:600;border-bottom:1px solid #eef3f6">${esc(v)}</td></tr>`)
    .join('')}</table>`;

/**
 * Returns { subject, html, text, waTemplate, waParams } for a notification.
 * vars: patientName, doctorName, department, when, mode, code, place, meetingUrl, reason, link, ...
 */
export function renderTemplate(type, v = {}) {
  const link = v.link ? `${env.CLIENT_URL}${v.link}` : env.CLIENT_URL;
  const place = v.mode === 'video' ? `Video consultation${v.meetingUrl ? ` – ${v.meetingUrl}` : ''}` : v.place || 'In-clinic visit';

  switch (type) {
    case T.APPT_CONFIRMED: {
      const text = `Hi ${v.patientName}, your appointment is CONFIRMED.\nDoctor: ${v.doctorName} (${v.department})\nWhen: ${v.when}\nMode: ${place}\nBooking ID: ${v.code}\nTo reschedule or cancel: ${link}`;
      return {
        subject: `Appointment confirmed – ${v.doctorName}, ${v.when}`,
        html: layout('Your appointment is confirmed ✅', `<p>Hi ${esc(v.patientName)}, your booking is confirmed.</p>${rows([['Doctor', v.doctorName], ['Department', v.department], ['When', v.when], ['Mode', place], ['Booking ID', v.code], ['Fee', v.fee ? `₹${v.fee}` : null]])}`, { label: 'View appointment', url: link }),
        text,
        waTemplate: 'appointment_confirmed',
        waParams: [v.patientName, v.doctorName, v.when, v.mode === 'video' ? 'Video' : 'In-clinic', v.code],
      };
    }
    case T.APPT_RESCHEDULED: {
      const text = `Hi ${v.patientName}, your appointment was RESCHEDULED.\nDoctor: ${v.doctorName}\nNew time: ${v.when}\nPrevious: ${v.previous}\nBooking ID: ${v.code}\n${link}`;
      return {
        subject: `Appointment rescheduled – now ${v.when}`,
        html: layout('Appointment rescheduled 🔄', `<p>Hi ${esc(v.patientName)}, your appointment time has changed.</p>${rows([['Doctor', v.doctorName], ['New time', v.when], ['Previous time', v.previous], ['Mode', place], ['Booking ID', v.code]])}`, { label: 'View appointment', url: link }),
        text,
        waTemplate: 'appointment_rescheduled',
        waParams: [v.patientName, v.doctorName, v.when, v.previous, v.code],
      };
    }
    case T.APPT_CANCELLED: {
      const text = `Hi ${v.patientName}, your appointment ${v.code} with ${v.doctorName} on ${v.when} was CANCELLED.${v.refund ? `\nRefund of ₹${v.refund} will reach you in 5-7 working days.` : ''}${v.reason ? `\nReason: ${v.reason}` : ''}`;
      return {
        subject: `Appointment cancelled – ${v.code}`,
        html: layout('Appointment cancelled', `<p>Hi ${esc(v.patientName)}, the following appointment was cancelled.</p>${rows([['Doctor', v.doctorName], ['Was scheduled', v.when], ['Booking ID', v.code], ['Reason', v.reason], ['Refund', v.refund ? `₹${v.refund}` : null]])}`, { label: 'Book again', url: `${env.CLIENT_URL}/doctors` }),
        text,
        waTemplate: 'appointment_cancelled',
        waParams: [v.patientName, v.doctorName, v.when, v.code],
      };
    }
    case T.APPT_REMINDER: {
      const text = `Reminder: ${v.patientName}, you have an appointment ${v.leadLabel} with ${v.doctorName} at ${v.when}.\nMode: ${place}\nBooking ID: ${v.code}`;
      return {
        subject: `Reminder: appointment ${v.leadLabel} – ${v.doctorName}`,
        html: layout('Appointment reminder ⏰', `<p>Hi ${esc(v.patientName)}, a quick reminder about your visit ${esc(v.leadLabel)}.</p>${rows([['Doctor', v.doctorName], ['When', v.when], ['Mode', place], ['Booking ID', v.code]])}`, { label: v.mode === 'video' ? 'Join consultation' : 'View appointment', url: v.mode === 'video' && v.meetingUrl ? v.meetingUrl : link }),
        text,
        waTemplate: 'appointment_reminder',
        waParams: [v.patientName, v.doctorName, v.when, v.leadLabel],
      };
    }
    case T.RX_READY: {
      const text = `Hi ${v.patientName}, your prescription ${v.code} from ${v.doctorName} is ready. View it and order medicines: ${link}`;
      return {
        subject: `Your prescription from ${v.doctorName} is ready`,
        html: layout('Prescription ready 💊', `<p>Hi ${esc(v.patientName)}, ${esc(v.doctorName)} has issued your prescription.</p>${rows([['Prescription', v.code], ['Diagnosis', v.diagnosis]])}`, { label: 'Read prescription', url: link }),
        text,
        waTemplate: 'prescription_ready',
        waParams: [v.patientName, v.doctorName, v.code],
      };
    }
    case T.MED_REMINDER: {
      const text = `💊 Time for your medicine: ${v.medicineName} (${v.dosage || ''}) – ${v.mealLabel || ''}`;
      return { subject: `Medicine reminder – ${v.medicineName}`, html: layout('Medicine reminder 💊', `<p>${esc(text)}</p>`, { label: 'Mark as taken', url: link }), text, waTemplate: 'medicine_reminder', waParams: [v.patientName, v.medicineName, v.dosage || ''] };
    }
    case T.ORDER_UPDATE: {
      const text = `Hi ${v.patientName}, your medicine order ${v.code} is now ${v.statusLabel}.${v.otp ? `\nDelivery OTP: ${v.otp} (share only with the rider)` : ''}\nTrack: ${link}`;
      return {
        subject: `Order ${v.code}: ${v.statusLabel}`,
        html: layout(`Order ${esc(v.statusLabel)}`, `<p>Hi ${esc(v.patientName)},</p>${rows([['Order', v.code], ['Status', v.statusLabel], ['Total', v.total ? `₹${v.total}` : null], ['Delivery OTP', v.otp]])}`, { label: 'Track order', url: link }),
        text,
        waTemplate: 'order_update',
        waParams: [v.patientName, v.code, v.statusLabel],
      };
    }
    default:
      return { subject: v.title || env.APP_NAME, html: layout(v.title || env.APP_NAME, `<p>${esc(v.body || '')}</p>`), text: v.body || v.title || '', waTemplate: 'generic_update', waParams: [v.title || '', v.body || ''] };
  }
}
