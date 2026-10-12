import crypto from 'crypto'; // timingSafeEqual for OTP check
import mongoose from 'mongoose';
import { Medicine } from '../models/Medicine.js';
import { MedicineOrder } from '../models/MedicineOrder.js';
import { Prescription } from '../models/Prescription.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS as O, ORDER_TRANSITIONS, NOTIFY_TYPE as T, PAY_PURPOSE, PAY_STATUS, ROLES } from '../utils/constants.js';
import { genCode, haversineKm } from '../utils/helpers.js';
import { computeTotals } from '../utils/pricing.js';
import { deliveryOtp as makeOtp } from '../utils/otp.js';
import { cursorPaginate, pageMeta, pageParams } from '../utils/pagination.js';
import { invalidateNamespace } from '../utils/cache.js';
import { emit, emitToUser } from '../sockets/index.js';
import { getSettings } from './settings.service.js';
import { createPaymentOrder, refundPayment, registerPaymentHandler } from './payment.service.js';
import { notifyUser } from './notification.service.js';
import { prescriptionCovers } from './prescription.service.js';

const STATUS_LABEL = {
  pending_payment: 'awaiting payment', placed: 'placed', confirmed: 'confirmed by pharmacy', packed: 'packed',
  out_for_delivery: 'out for delivery', delivered: 'delivered', cancelled: 'cancelled', rejected: 'rejected',
};
const MAX_QTY = 10;

/** 4-digit hand-over OTP derived from the order id (not stored). */
export const deliveryOtp = (orderId) => makeOtp(orderId, env.JWT_ACCESS_SECRET);

async function loadLines(items) {
  const ids = items.map((i) => i.medicineId);
  if (new Set(ids.map(String)).size !== ids.length) throw ApiError.badRequest('Duplicate medicines in cart');
  const meds = await Medicine.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(meds.map((m) => [String(m._id), m]));
  return items.map((i) => {
    const m = byId.get(String(i.medicineId));
    if (!m) throw ApiError.badRequest('One of the medicines is no longer available', 'MEDICINE_UNAVAILABLE');
    if (i.qty > MAX_QTY) throw ApiError.badRequest(`Maximum ${MAX_QTY} units per medicine`);
    if (m.stock < i.qty) throw ApiError.conflict(`Only ${m.stock} left of ${m.name}`, 'OUT_OF_STOCK', { medicineId: m._id, stock: m.stock });
    return { medicine: m, qty: i.qty, price: m.price, name: m.name, requiresPrescription: m.requiresPrescription };
  });
}

export async function quote(items) {
  const settings = await getSettings();
  const lines = await loadLines(items);
  return { ...computeTotals(lines, settings), items: lines.map((l) => ({ medicine: l.medicine._id, name: l.name, price: l.price, qty: l.qty, requiresPrescription: l.requiresPrescription })) };
}

async function restock(items) {
  await Promise.all(items.map((i) => Medicine.updateOne({ _id: i.medicine }, { $inc: { stock: i.qty } })));
  await invalidateNamespace('medicines');
}

export async function placeOrder(user, input) {
  const settings = await getSettings();
  const lines = await loadLines(input.items);

  // --- address
  let address = input.address;
  if (input.addressId) {
    const a = user.addresses.id(input.addressId);
    if (!a) throw ApiError.badRequest('Address not found');
    address = a.toObject();
  }
  if (!address) throw ApiError.badRequest('Delivery address required');
  address = { name: address.name || user.name, phone: address.phone || user.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode, location: address.location };

  // --- prescription gate for Rx-only medicines
  const rxLines = lines.filter((l) => l.requiresPrescription);
  let rx = null;
  if (rxLines.length) {
    if (!input.prescriptionId) throw ApiError.badRequest(`Prescription required for: ${rxLines.map((l) => l.name).join(', ')}`, 'PRESCRIPTION_REQUIRED');
    rx = await Prescription.findOne({ _id: input.prescriptionId, patient: user._id });
    if (!rx) throw ApiError.badRequest('Prescription not found', 'PRESCRIPTION_INVALID');
    const missing = rxLines.filter((l) => !prescriptionCovers(rx, l.medicine));
    if (missing.length) throw ApiError.badRequest(`Not covered by the prescription (or it expired): ${missing.map((l) => l.name).join(', ')}`, 'PRESCRIPTION_MISMATCH');
  }

  const payMethod = input.payMethod === 'cod' && settings.codEnabled ? 'cod' : 'online';
  const totals = computeTotals(lines, settings);

  // --- reserve stock atomically (conditional decrement), compensate on failure
  const reserved = [];
  try {
    for (const l of lines) {
      const r = await Medicine.updateOne({ _id: l.medicine._id, isActive: true, stock: { $gte: l.qty } }, { $inc: { stock: -l.qty } });
      if (!r.modifiedCount) throw ApiError.conflict(`${l.name} just went out of stock`, 'OUT_OF_STOCK');
      reserved.push({ medicine: l.medicine._id, qty: l.qty });
    }
  } catch (e) {
    await restock(reserved);
    throw e;
  }

  let order;
  try {
    order = await MedicineOrder.create({
      code: genCode('ORD'),
      patient: user._id,
      prescription: rx?._id,
      items: lines.map((l) => ({ medicine: l.medicine._id, name: l.name, price: l.price, qty: l.qty, requiresPrescription: l.requiresPrescription })),
      address,
      ...totals,
      payMethod,
      paymentStatus: payMethod === 'cod' ? PAY_STATUS.COD : PAY_STATUS.PENDING,
      status: payMethod === 'cod' ? O.PLACED : O.PENDING_PAYMENT,
      note: input.note,
      history: [{ status: payMethod === 'cod' ? O.PLACED : O.PENDING_PAYMENT, by: user._id }],
    });
  } catch (e) {
    await restock(reserved);
    throw e;
  }
  await invalidateNamespace('medicines');

  let payment = null;
  if (payMethod === 'online') {
    payment = await createPaymentOrder({ user, purpose: PAY_PURPOSE.MEDICINE_ORDER, refId: order._id, amount: order.total, receipt: order.code });
    order.payment = payment.paymentId;
    await order.save();
  } else {
    await afterPlaced(order._id);
  }
  return { order, payment };
}

async function afterPlaced(id) {
  const o = await MedicineOrder.findById(id).populate('patient', 'name email phone prefs');
  emit('role:pharmacist', 'order:new', { id: o._id, code: o.code, total: o.total });
  emit('role:admin', 'order:new', { id: o._id, code: o.code, total: o.total });
  emitToUser(o.patient._id, 'order:updated', { id: o._id, status: o.status });
  await notifyUser({
    user: o.patient, type: T.ORDER_UPDATE, kind: 'order', title: 'Order placed', body: `${o.code} · ₹${o.total}`,
    data: { orderId: o._id }, vars: { code: o.code, statusLabel: STATUS_LABEL[o.status], total: o.total, link: `/orders/${o._id}` }, ref: { kind: 'order', id: o._id },
  });
}

registerPaymentHandler(PAY_PURPOSE.MEDICINE_ORDER, {
  onPaid: async (payment) => {
    const o = await MedicineOrder.findOneAndUpdate(
      { _id: payment.refId, status: O.PENDING_PAYMENT },
      { $set: { status: O.PLACED, paymentStatus: PAY_STATUS.PAID, payment: payment._id }, $push: { history: { at: new Date(), status: O.PLACED, note: 'payment received' } } },
      { new: true },
    );
    if (o) return afterPlaced(o._id);
    // paid after the unpaid sweep cancelled it -> refund
    const late = await MedicineOrder.findById(payment.refId);
    if (late && late.status === O.CANCELLED) {
      await refundPayment(payment._id, { reason: 'order expired before payment' }).catch(() => {});
      await MedicineOrder.updateOne({ _id: late._id }, { paymentStatus: PAY_STATUS.REFUNDED });
    }
  },
});

/* ------------------------------------- state changes ------------------------------------- */
async function transition(order, to, actor, { note, extra = {}, from } = {}) {
  const allowed = ORDER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(to)) throw ApiError.conflict(`Cannot move order from ${order.status} to ${to}`, 'BAD_TRANSITION');
  const o = await MedicineOrder.findOneAndUpdate(
    { _id: order._id, status: from || order.status },
    { $set: { status: to, ...extra }, $push: { history: { at: new Date(), status: to, by: actor?._id, note } } },
    { new: true },
  );
  if (!o) throw ApiError.conflict('Order changed, please refresh', 'BAD_STATE');
  return o;
}

async function announce(orderId, { otp } = {}) {
  const o = await MedicineOrder.findById(orderId).populate('patient', 'name email phone prefs');
  const payload = { id: o._id, status: o.status, rider: o.rider, riderLocation: o.riderLocation };
  emitToUser(o.patient._id, 'order:updated', payload);
  emit(`order:${o._id}`, 'order:updated', payload);
  emit('role:pharmacist', 'order:updated', payload);
  if (o.rider) emitToUser(o.rider, 'order:updated', payload);
  await notifyUser({
    user: o.patient, type: T.ORDER_UPDATE, kind: 'order', title: `Order ${STATUS_LABEL[o.status]}`, body: o.code,
    data: { orderId: o._id }, vars: { code: o.code, statusLabel: STATUS_LABEL[o.status], total: o.total, otp, link: `/orders/${o._id}` }, ref: { kind: 'order', id: o._id },
  });
  return o;
}

export async function staffUpdateStatus(actor, id, to, note) {
  const order = await MedicineOrder.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if ([O.OUT_FOR_DELIVERY, O.DELIVERED].includes(to)) throw ApiError.badRequest('Pickup and delivery are completed by the assigned rider');
  if (to === O.CANCELLED || to === O.REJECTED) return cancelOrder(actor, id, note, to);
  if (to === O.PACKED && !order.rider) {
    // auto-assign the best rider as soon as it is packed
    await assignRider(actor, id).catch(() => {});
  }
  await transition(order, to, actor, { note });
  return announce(id);
}

export async function assignRider(actor, id, riderId) {
  const order = await MedicineOrder.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (![O.CONFIRMED, O.PACKED].includes(order.status)) throw ApiError.conflict('Rider can be assigned after confirmation');

  let rider;
  if (riderId) {
    rider = await User.findOne({ _id: riderId, role: ROLES.RIDER, isActive: true });
    if (!rider) throw ApiError.badRequest('Rider not found');
  } else {
    const riders = await User.find({ role: ROLES.RIDER, isActive: true, 'rider.online': true }).lean();
    if (!riders.length) throw ApiError.conflict('No rider is online right now', 'NO_RIDER');
    const dest = order.address?.location;
    rider = riders
      .map((r) => ({ r, d: dest && r.rider?.location?.lat ? haversineKm(dest, r.rider.location) : 999 }))
      .sort((a, b) => a.r.rider.activeOrders - b.r.rider.activeOrders || a.d - b.d)[0].r;
  }
  const prev = order.rider;
  const updated = await MedicineOrder.findOneAndUpdate({ _id: id, status: { $in: [O.CONFIRMED, O.PACKED] }, rider: prev || { $exists: false } }, { $set: { rider: rider._id }, $push: { history: { at: new Date(), status: order.status, by: actor?._id, note: `rider assigned: ${rider.name}` } } }, { new: true });
  if (!updated) throw ApiError.conflict('Order changed, please refresh');
  await User.updateOne({ _id: rider._id }, { $inc: { 'rider.activeOrders': 1 } });
  if (prev) await User.updateOne({ _id: prev, 'rider.activeOrders': { $gt: 0 } }, { $inc: { 'rider.activeOrders': -1 } });
  emitToUser(rider._id, 'order:assigned', { id: updated._id, code: updated.code });
  await notifyUser({ userId: rider._id, type: T.ORDER_NEW, title: 'New delivery assigned', body: `${updated.code} · ${updated.address.city}`, kind: 'system', email: false, whatsapp: false, data: { orderId: updated._id } });
  return announce(id);
}

export async function riderAction(rider, id, { action, otp }) {
  const order = await MedicineOrder.findOne({ _id: id, rider: rider._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (action === 'pickup') {
    if (order.status !== O.PACKED) throw ApiError.conflict('Order is not packed yet');
    await transition(order, O.OUT_FOR_DELIVERY, rider, { note: 'picked up by rider' });
    return announce(id, { otp: deliveryOtp(order._id) });
  }
  if (action === 'deliver') {
    if (order.status !== O.OUT_FOR_DELIVERY) throw ApiError.conflict('Order is not out for delivery');
    const expected = Buffer.from(deliveryOtp(order._id));
    const given = Buffer.from(String(otp || '').padEnd(4, ' ').slice(0, 4));
    if (!crypto.timingSafeEqual(expected, given)) throw ApiError.badRequest('Incorrect delivery OTP', 'BAD_DELIVERY_OTP');
    await transition(order, O.DELIVERED, rider, {
      note: 'delivered',
      extra: { deliveredAt: new Date(), ...(order.payMethod === 'cod' ? { paymentStatus: PAY_STATUS.PAID } : {}) },
    });
    await User.updateOne({ _id: rider._id, 'rider.activeOrders': { $gt: 0 } }, { $inc: { 'rider.activeOrders': -1 } });
    return announce(id);
  }
  throw ApiError.badRequest('Unknown action');
}

/** Rider GPS heartbeat – fan-out to each order being tracked. */
export async function pushLocation(rider, { lat, lng }) {
  const at = new Date();
  await User.updateOne({ _id: rider._id }, { $set: { 'rider.location': { lat, lng, updatedAt: at } } });
  const orders = await MedicineOrder.find({ rider: rider._id, status: O.OUT_FOR_DELIVERY }).select('patient address').lean();
  for (const o of orders) {
    const dest = o.address?.location;
    const etaMinutes = dest?.lat ? Math.max(1, Math.round((haversineKm({ lat, lng }, dest) / 20) * 60)) : undefined; // ~20 km/h city average
    await MedicineOrder.updateOne({ _id: o._id }, { $set: { riderLocation: { lat, lng, at }, etaMinutes } });
    const payload = { id: o._id, lat, lng, at, etaMinutes };
    emit(`order:${o._id}`, 'order:location', payload);
    emitToUser(o.patient, 'order:location', payload);
  }
  return { ok: true, tracking: orders.length };
}

export async function setRiderAvailability(rider, online) {
  await User.updateOne({ _id: rider._id }, { $set: { 'rider.online': Boolean(online) } });
  return { online: Boolean(online) };
}

export async function cancelOrder(actor, id, reason, as = O.CANCELLED) {
  const order = await MedicineOrder.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  const isPatient = actor.role === ROLES.PATIENT;
  if (isPatient && String(order.patient) !== String(actor._id)) throw ApiError.notFound('Order not found');
  if (isPatient && ![O.PENDING_PAYMENT, O.PLACED, O.CONFIRMED].includes(order.status)) {
    throw ApiError.conflict('Order can no longer be cancelled, it is already being prepared or delivered', 'BAD_STATE');
  }
  const o = await transition(order, as, actor, { note: reason, extra: { cancelReason: reason, stockReserved: false } });
  if (order.stockReserved) await restock(order.items);
  if (order.rider) await User.updateOne({ _id: order.rider, 'rider.activeOrders': { $gt: 0 } }, { $inc: { 'rider.activeOrders': -1 } });
  if (o.paymentStatus === PAY_STATUS.PAID && o.payment) {
    const r = await refundPayment(o.payment, { reason: reason || 'order cancelled' });
    if (r) await MedicineOrder.updateOne({ _id: o._id }, { paymentStatus: PAY_STATUS.REFUNDED });
  }
  return announce(id);
}

/** Orders left unpaid for 30 min release their reserved stock. */
export async function sweepUnpaidOrders() {
  const stale = await MedicineOrder.find({ status: O.PENDING_PAYMENT, createdAt: { $lt: new Date(Date.now() - 30 * 60_000) } }).limit(200);
  let n = 0;
  for (const o of stale) {
    const done = await MedicineOrder.findOneAndUpdate(
      { _id: o._id, status: O.PENDING_PAYMENT },
      { $set: { status: O.CANCELLED, cancelReason: 'Payment not completed', stockReserved: false }, $push: { history: { at: new Date(), status: O.CANCELLED, note: 'payment timeout' } } },
    );
    if (done) { await restock(o.items); n += 1; }
  }
  return n;
}

/* ----------------------------------------- queries ----------------------------------------- */
export async function getOrder(actor, id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Order not found');
  const o = await MedicineOrder.findById(id).populate([{ path: 'rider', select: 'name phone rider.location' }, { path: 'patient', select: 'name phone' }, { path: 'prescription', select: 'code' }]);
  if (!o) throw ApiError.notFound('Order not found');
  const staff = [ROLES.ADMIN, ROLES.PHARMACIST].includes(actor.role);
  const isPatient = String(o.patient._id) === String(actor._id);
  const isRider = o.rider && String(o.rider._id) === String(actor._id);
  if (!staff && !isPatient && !isRider) throw ApiError.notFound('Order not found');
  const json = o.toJSON();
  if (isPatient && o.status === O.OUT_FOR_DELIVERY) json.deliveryOtp = deliveryOtp(o._id);
  if (!isPatient && !staff) delete json.patient?.phone;
  return json;
}

export const listForPatient = (userId, { cursor, limit }) => cursorPaginate(MedicineOrder, { patient: userId }, { cursor, limit });

export async function staffList(query) {
  const { page, limit, skip } = pageParams(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.q) filter.code = new RegExp(String(query.q).replace(/[^\w-]/g, ''), 'i');
  const [items, total] = await Promise.all([
    MedicineOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('rider', 'name phone').populate('patient', 'name phone').lean(),
    MedicineOrder.countDocuments(filter),
  ]);
  return { items, meta: pageMeta(total, page, limit) };
}

export const riderList = (riderId, { history }) =>
  MedicineOrder.find({ rider: riderId, status: history ? { $in: [O.DELIVERED] } : { $in: [O.CONFIRMED, O.PACKED, O.OUT_FOR_DELIVERY] } })
    .sort({ updatedAt: -1 }).limit(50).lean();

export const availableRiders = () => User.find({ role: ROLES.RIDER, isActive: true }).select('name phone rider').lean();

export async function payOrder(user, id) {
  const o = await MedicineOrder.findOne({ _id: id, patient: user._id });
  if (!o) throw ApiError.notFound('Order not found');
  if (o.status !== O.PENDING_PAYMENT) throw ApiError.conflict('Nothing to pay for this order');
  return createPaymentOrder({ user, purpose: PAY_PURPOSE.MEDICINE_ORDER, refId: o._id, amount: o.total, receipt: o.code });
}
