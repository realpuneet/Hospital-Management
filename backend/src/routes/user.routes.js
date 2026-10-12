import { Router } from 'express';
import * as c from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { idParam, cursorQuery } from '../validators/common.js';
import * as v from '../validators/user.validator.js';
import { changePassword } from '../validators/auth.validator.js';

const r = Router();
r.use(requireAuth);
r.patch('/profile', validate({ body: v.updateProfile }), c.updateProfile);
r.patch('/preferences', validate({ body: v.prefs }), c.updatePrefs);
r.post('/password', validate({ body: changePassword }), c.changePassword);

r.post('/addresses', validate({ body: v.address }), c.addAddress);
r.patch('/addresses/:id', validate({ params: idParam, body: v.addressUpdate }), c.updateAddress);
r.delete('/addresses/:id', validate({ params: idParam }), c.removeAddress);

r.post('/members', validate({ body: v.member }), c.addMember);
r.patch('/members/:id', validate({ params: idParam, body: v.memberUpdate }), c.updateMember);
r.delete('/members/:id', validate({ params: idParam }), c.removeMember);

r.get('/notifications', validate({ query: cursorQuery }), c.notifications);
r.post('/notifications/:id/read', c.markRead);
export default r;
