import { Router } from 'express';
import * as c from '../controllers/doctor.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idParam, objectId, cursorQuery } from '../validators/common.js';
import { z } from 'zod';
import * as av from '../validators/appointment.validator.js';
import * as dv from '../validators/doctor.validator.js';
import * as rv from '../validators/prescription.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
r.use(requireAuth, requireRole(ROLES.DOCTOR));
r.get('/dashboard', c.dashboard);
r.get('/appointments', validate({ query: av.doctorList }), c.appointments);
r.get('/appointments/:id', validate({ params: idParam }), c.appointment);
r.patch('/appointments/:id/status', validate({ params: idParam, body: av.statusChange }), c.changeStatus);
r.post('/appointments/:id/reschedule', validate({ params: idParam, body: av.reschedule }), c.reschedule);
r.put('/appointments/:id/consultation', validate({ params: idParam, body: av.consultation }), c.consultation);
r.put('/appointments/:id/prescription', validate({ params: idParam, body: rv.upsert }), c.prescribe);
r.get('/patients/:patientId/history', validate({ params: z.object({ patientId: objectId }) }), c.patientHistory);
r.get('/prescriptions', validate({ query: cursorQuery }), c.prescriptions);

r.get('/profile', c.profile);
r.patch('/profile', validate({ body: dv.myProfile }), c.updateProfile);
r.put('/schedule', validate({ body: dv.schedule }), c.updateSchedule);
r.post('/leaves', validate({ body: dv.leave }), c.addLeave);
r.delete('/leaves/:date', validate({ params: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) }), c.removeLeave);
export default r;
