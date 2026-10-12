import { Router } from 'express';
import * as c from '../controllers/appointment.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { bookingLimiter } from '../middlewares/rateLimiter.js';
import { idempotent } from '../middlewares/idempotency.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/appointment.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
r.use(requireAuth);

const patient = requireRole(ROLES.PATIENT);
r.post('/', patient, bookingLimiter, idempotent('book'), validate({ body: v.book }), c.book);
r.get('/', patient, validate({ query: v.listQuery }), c.list);
// patient, doctor and admin may read/act on appointments they own (service re-checks ownership)
r.get('/:id', validate({ params: idParam }), c.get);
r.get('/:id/join', validate({ params: idParam }), c.join);
r.post('/:id/pay', patient, validate({ params: idParam }), c.pay);
r.post('/:id/reschedule', patient, bookingLimiter, validate({ params: idParam, body: v.reschedule }), c.reschedule);
r.post('/:id/cancel', patient, validate({ params: idParam, body: v.cancel }), c.cancel);
r.post('/:id/review', patient, validate({ params: idParam, body: v.review }), c.review);
export default r;
