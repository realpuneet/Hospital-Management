import { round2 } from './helpers.js';

/** Pricing – pure so it's unit-testable. Prices are GST-inclusive (MRP style). */
export function computeTotals(lines, settings) {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const deliveryFee = subtotal >= settings.freeDeliveryAbove || subtotal === 0 ? 0 : settings.deliveryFee;
  const gst = round2((subtotal * settings.gstPercent) / (100 + settings.gstPercent));
  return { subtotal, gst, deliveryFee, total: round2(subtotal + deliveryFee) };
}
