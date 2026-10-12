import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as rx from '../services/prescription.service.js';
import * as meds from '../services/medication.service.js';

export const list = asyncHandler(async (req, res) => {
  const r = await rx.listForPatient(req.user._id, req.query);
  return ok(res, r.items, 'OK', { nextCursor: r.nextCursor, hasMore: r.hasMore });
});
export const get = asyncHandler(async (req, res) => ok(res, await rx.getPrescription(req.user, req.params.id)));

export const medications = asyncHandler(async (req, res) => ok(res, await meds.listMedications(req.user._id, { activeOnly: req.query.all !== 'true' })));
export const today = asyncHandler(async (req, res) => ok(res, await meds.todaysDoses(req.user._id)));
export const markDose = asyncHandler(async (req, res) => ok(res, await meds.markDose(req.user._id, req.params.id, req.body.key, req.body.taken)));
export const createMedication = asyncHandler(async (req, res) => created(res, await meds.createManual(req.user._id, req.body)));
export const updateMedication = asyncHandler(async (req, res) => ok(res, await meds.updateMedication(req.user._id, req.params.id, req.body)));
export const stopMedication = asyncHandler(async (req, res) => {
  await meds.stopMedication(req.user._id, req.params.id);
  return noContent(res);
});
