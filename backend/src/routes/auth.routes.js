import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.js';
import * as v from '../validators/auth.validator.js';

const r = Router();
r.post('/register', authLimiter, validate({ body: v.register }), c.register);
r.post('/login', authLimiter, validate({ body: v.login }), c.login);
r.post('/otp/request', otpLimiter, validate({ body: v.otpRequest }), c.otpRequest);
r.post('/otp/verify', authLimiter, validate({ body: v.otpVerify }), c.otpVerify);
r.post('/refresh', c.refresh);
r.post('/logout', c.logout);
r.get('/me', requireAuth, c.me);
export default r;
