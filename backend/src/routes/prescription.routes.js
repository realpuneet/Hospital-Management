import { Router } from 'express';
import * as c from '../controllers/prescription.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/prescription.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
r.use(requireAuth);

// medication tracker (patients) – declared before '/:id'
r.get('/medications', requireRole(ROLES.PATIENT), c.medications);
r.get('/medications/today', requireRole(ROLES.PATIENT), c.today);
r.post('/medications', requireRole(ROLES.PATIENT), validate({ body: v.medicationCreate }), c.createMedication);
r.patch('/medications/:id', requireRole(ROLES.PATIENT), validate({ params: idParam, body: v.medicationUpdate }), c.updateMedication);
r.post('/medications/:id/dose', requireRole(ROLES.PATIENT), validate({ params: idParam, body: v.doseBody }), c.markDose);
r.delete('/medications/:id', requireRole(ROLES.PATIENT), validate({ params: idParam }), c.stopMedication);

r.get('/', requireRole(ROLES.PATIENT), validate({ query: v.listQuery }), c.list);
r.get('/:id', validate({ params: idParam }), c.get);
export default r;
