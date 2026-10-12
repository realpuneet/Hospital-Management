import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * WhatsApp delivery. Providers:
 *  - dryrun : logs only (default, no credentials)
 *  - meta   : WhatsApp Cloud API, uses APPROVED TEMPLATES (required for business-initiated messages)
 *  - twilio : Twilio WhatsApp (sandbox / approved sender), sends free text body
 * `to` must be E.164 digits without '+'.
 */
export async function sendWhatsApp({ to, template, params = [], text }) {
  if (!env.WHATSAPP_ENABLED) return { status: 'dry_run', provider: 'disabled' };

  if (env.WHATSAPP_PROVIDER === 'meta') {
    if (!env.WA_META_TOKEN || !env.WA_META_PHONE_ID) throw new Error('Meta WhatsApp credentials missing');
    const res = await fetch(`https://graph.facebook.com/v20.0/${env.WA_META_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.WA_META_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: env.WA_META_TEMPLATE_LANG },
          components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p).slice(0, 500) })) }],
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Meta WA ${res.status}: ${json?.error?.message || 'send failed'}`);
    return { status: 'sent', provider: 'meta', providerId: json?.messages?.[0]?.id };
  }

  if (env.WHATSAPP_PROVIDER === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) throw new Error('Twilio credentials missing');
    const body = new URLSearchParams({ From: env.TWILIO_WHATSAPP_FROM, To: `whatsapp:+${to}`, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${json?.message || 'send failed'}`);
    return { status: 'sent', provider: 'twilio', providerId: json.sid };
  }

  logger.info({ to, template, text }, '[whatsapp:dry-run]');
  return { status: 'dry_run', provider: 'dryrun' };
}
