import { Router } from 'express';
import * as c from '../controllers/catalog.controller.js';
import { validate } from '../middlewares/validate.js';
import * as dv from '../validators/doctor.validator.js';
import * as av from '../validators/appointment.validator.js';
import * as pv from '../validators/pharmacy.validator.js';

const r = Router();
r.get('/settings', c.settings);
r.get('/departments', c.departments);
r.get('/doctors', validate({ query: dv.listQuery }), c.doctorList);
r.get('/doctors/:id', c.doctorGet);
r.get('/doctors/:id/slots', validate({ query: av.slotsQuery }), c.doctorSlots);
r.get('/medicines', validate({ query: pv.medicineList }), c.medicineList);
r.get('/medicines/categories', c.medicineCategories);
r.get('/medicines/:id', c.medicineGet);
export default r;
