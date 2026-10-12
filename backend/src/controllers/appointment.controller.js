import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/ApiResponse.js';
import * as appts from '../services/appointment.service.js';
import * as payments from '../services/payment.service.js';

export const book = asyncHandler(async (req, res) => created(res, await appts.bookAppointment(req.user, req.body), 'Appointment booked'));
export const list = asyncHandler(async (req, res) => {
  const r = await appts.listForPatient(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const get = asyncHandler(async (req, res) => ok(res, await appts.getForUser(req.user, req.params.id)));
export const pay = asyncHandler(async (req, res) => ok(res, await appts.payAppointment(req.user, req.params.id)));
export const reschedule = asyncHandler(async (req, res) => ok(res, await appts.rescheduleAppointment(req.user, req.params.id, req.body), 'Appointment rescheduled'));
export const cancel = asyncHandler(async (req, res) => ok(res, await appts.cancelAppointment(req.user, req.params.id, req.body.reason), 'Appointment cancelled'));
export const review = asyncHandler(async (req, res) => ok(res, await appts.reviewAppointment(req.user, req.params.id, req.body), 'Thanks for your feedback'));
export const join = asyncHandler(async (req, res) => ok(res, await appts.joinInfo(req.user, req.params.id)));

export const verifyPayment = asyncHandler(async (req, res) =>
  ok(res, await payments.verifyCheckout({ userId: req.user._id, ...req.body }), 'Payment verified'),
);
export const webhook = asyncHandler(async (req, res) => {
  await payments.handleWebhook(req.body, req.headers['x-razorpay-signature']);
  res.json({ received: true });
});
