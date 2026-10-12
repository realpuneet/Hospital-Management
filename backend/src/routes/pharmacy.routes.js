import { Router } from 'express';
import * as c from '../controllers/pharmacy.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idempotent } from '../middlewares/idempotency.js';
import { rateLimit } from '../middlewares/rateLimiter.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/pharmacy.validator.js';
import { ROLES } from '../utils/constants.js';

const { PATIENT, PHARMACIST, ADMIN, RIDER } = ROLES;

/* ---- patient orders: /api/v1/orders ---- */
export const orders = Router();
orders.use(requireAuth);
orders.post('/quote', requireRole(PATIENT), validate({ body: v.quote }), c.quote);
orders.post('/', requireRole(PATIENT), rateLimit({ max: 10, prefix: 'rl:order', key: (q) => q.user.id }), idempotent('order'), validate({ body: v.placeOrder }), c.place);
orders.get('/', requireRole(PATIENT), validate({ query: v.orderList }), c.list);
orders.get('/:id', validate({ params: idParam }), c.get);
orders.post('/:id/pay', requireRole(PATIENT), validate({ params: idParam }), c.pay);
orders.post('/:id/cancel', requireRole(PATIENT), validate({ params: idParam, body: v.cancel }), c.cancel);

/* ---- pharmacy back-office: /api/v1/pharmacy ---- */
export const pharmacy = Router();
pharmacy.use(requireAuth, requireRole(PHARMACIST, ADMIN));
pharmacy.get('/orders', validate({ query: v.staffList }), c.staffList);
pharmacy.patch('/orders/:id/status', validate({ params: idParam, body: v.staffStatus }), c.staffStatus);
pharmacy.post('/orders/:id/assign-rider', validate({ params: idParam, body: v.assignRider }), c.assignRider);
pharmacy.get('/riders', c.riders);
pharmacy.get('/medicines', c.medicineList);
pharmacy.get('/medicines/low-stock', c.lowStock);
pharmacy.post('/medicines', validate({ body: v.medicineBody }), c.medicineCreate);
pharmacy.patch('/medicines/:id', validate({ params: idParam, body: v.medicineUpdate }), c.medicineUpdate);
pharmacy.post('/medicines/:id/stock', validate({ params: idParam, body: v.stockAdjust }), c.stockAdjust);
pharmacy.delete('/medicines/:id', validate({ params: idParam }), c.medicineDelete);

/* ---- rider app: /api/v1/rider ---- */
export const rider = Router();
rider.use(requireAuth, requireRole(RIDER));
rider.get('/orders', c.riderOrders);
rider.get('/orders/:id', validate({ params: idParam }), c.riderOrder);
rider.post('/orders/:id/action', validate({ params: idParam, body: v.riderAction }), c.riderAction);
rider.post('/location', rateLimit({ windowSec: 10, max: 8, prefix: 'rl:loc', key: (q) => q.user.id }), validate({ body: v.location }), c.riderLocation);
rider.put('/availability', validate({ body: v.availability }), c.riderAvailability);
