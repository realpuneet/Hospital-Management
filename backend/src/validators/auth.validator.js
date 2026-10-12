import { z } from 'zod';
import { emptyToUndef, phone } from './common.js';

const password = z.string().min(8, 'At least 8 characters').max(72).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');

export const register = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: emptyToUndef(z.string().trim().toLowerCase().email()),
    phone: emptyToUndef(phone),
    password,
  })
  .refine((v) => v.email || v.phone, { message: 'Email or phone is required', path: ['email'] });

export const login = z.object({ identifier: z.string().trim().min(3), password: z.string().min(1) });
export const otpRequest = z.object({ phone });
export const otpVerify = z.object({ phone, otp: z.string().regex(/^\d{6}$/, 'Enter the 6 digit OTP'), name: emptyToUndef(z.string().trim().min(2).max(80)) });
export const changePassword = z.object({ currentPassword: z.string().optional(), newPassword: password });
