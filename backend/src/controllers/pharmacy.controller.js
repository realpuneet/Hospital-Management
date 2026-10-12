import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as orders from '../services/order.service.js';
import * as meds from '../services/medicine.service.js';

/* patient */
export const quote = asyncHandler(async (req, res) => ok(res, await orders.quote(req.body.items)));
export const place = asyncHandler(async (req, res) => created(res, await orders.placeOrder(req.user, req.body), 'Order placed'));
export const list = asyncHandler(async (req, res) => {
  const r = await orders.listForPatient(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const get = asyncHandler(async (req, res) => ok(res, await orders.getOrder(req.user, req.params.id)));
export const cancel = asyncHandler(async (req, res) => ok(res, await orders.cancelOrder(req.user, req.params.id, req.body.reason), 'Order cancelled'));
export const pay = asyncHandler(async (req, res) => ok(res, await orders.payOrder(req.user, req.params.id)));

/* pharmacist / admin */
export const staffList = asyncHandler(async (req, res) => {
  const r = await orders.staffList(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const staffStatus = asyncHandler(async (req, res) => ok(res, await orders.staffUpdateStatus(req.user, req.params.id, req.body.status, req.body.note)));
export const assignRider = asyncHandler(async (req, res) => ok(res, await orders.assignRider(req.user, req.params.id, req.body.riderId), 'Rider assigned'));
export const riders = asyncHandler(async (_req, res) => ok(res, await orders.availableRiders()));

export const medicineList = asyncHandler(async (req, res) => {
  const r = await meds.adminList(req.query);
  return ok(res, r.items, 'OK', r.meta);
});
export const medicineCreate = asyncHandler(async (req, res) => created(res, await meds.createMedicine(req.body)));
export const medicineUpdate = asyncHandler(async (req, res) => ok(res, await meds.updateMedicine(req.params.id, req.body)));
export const medicineDelete = asyncHandler(async (req, res) => {
  await meds.deleteMedicine(req.params.id);
  return noContent(res);
});
export const stockAdjust = asyncHandler(async (req, res) => ok(res, await meds.adjustStock(req.params.id, req.body.delta, req.body.reason)));
export const lowStock = asyncHandler(async (_req, res) => ok(res, await meds.lowStock()));

/* rider */
export const riderOrders = asyncHandler(async (req, res) => ok(res, await orders.riderList(req.user._id, { history: req.query.history === 'true' })));
export const riderOrder = asyncHandler(async (req, res) => ok(res, await orders.getOrder(req.user, req.params.id)));
export const riderAction = asyncHandler(async (req, res) => ok(res, await orders.riderAction(req.user, req.params.id, req.body)));
export const riderLocation = asyncHandler(async (req, res) => ok(res, await orders.pushLocation(req.user, req.body)));
export const riderAvailability = asyncHandler(async (req, res) => ok(res, await orders.setRiderAvailability(req.user, req.body.online)));
