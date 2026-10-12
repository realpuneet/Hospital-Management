import crypto from 'crypto';

/** 4-digit delivery hand-over OTP, derived via HMAC so it never needs to be stored. */
export function deliveryOtp(orderId, secret) {
  const h = crypto.createHmac('sha256', secret).update(String(orderId)).digest('hex');
  return String(parseInt(h.slice(0, 8), 16) % 10000).padStart(4, '0');
}
