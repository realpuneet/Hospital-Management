import { Router } from 'express';
import * as c from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { idParam } from '../validators/common.js';
import * as v from '../validators/admin.validator.js';
import * as dv from '../validators/doctor.validator.js';
import * as av from '../validators/appointment.validator.js';
import { ROLES } from '../utils/constants.js';

const r = Router();
// uploads are available to any authenticated staff/patient (signed, scoped folder)
r.get('/upload-auth', requireAuth, c.uploadAuth);

r.use(requireAuth, requireRole(ROLES.ADMIN));
r.get('/dashboard', c.dashboard);
r.get('/users', validate({ query: v.userList }), c.users);
r.post('/staff', validate({ body: v.createStaff }), c.createStaff);
r.patch('/users/:id/active', validate({ params: idParam, body: v.setActive }), c.setActive);

r.get('/doctors', c.doctorList);
r.post('/doctors', validate({ body: dv.adminCreate }), c.doctorCreate);
r.patch('/doctors/:id', validate({ params: idParam, body: dv.adminUpdate }), c.doctorUpdate);

r.get('/departments', c.departmentList);
r.post('/departments', validate({ body: dv.departmentBody }), c.departmentCreate);
r.patch('/departments/:id', validate({ params: idParam, body: dv.departmentUpdate }), c.departmentUpdate);
r.delete('/departments/:id', validate({ params: idParam }), c.departmentDelete);

r.get('/appointments', validate({ query: v.apptList }), c.appointments);
r.post('/appointments/:id/cancel', validate({ params: idParam, body: av.cancel }), c.appointmentCancel);
r.post('/appointments/:id/reschedule', validate({ params: idParam, body: av.reschedule }), c.appointmentReschedule);

r.get('/notification-logs', validate({ query: v.logList }), c.logs);
r.get('/settings', c.settingsGet);
r.put('/settings', validate({ body: v.settings }), c.settingsUpdate);
export default r;
