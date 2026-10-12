import 'dotenv/config';
import { z } from 'zod';

const bool = (def) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(def ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1');
const num = (def) => z.coerce.number().default(def);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: num(5000),
  APP_NAME: z.string().default('CarePulse'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TZ: z.string().default('Asia/Kolkata'),
  LOG_LEVEL: z.string().default('info'),
  START_WORKER: bool(true),

  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/carepulse?replicaSet=rs0'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: num(30),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: z.string().optional().default(''),
  OTP_DEV_MODE: bool(false),
  OTP_TTL_SECONDS: num(300),

  SLOT_HOLD_MINUTES: num(10),
  BOOKING_WINDOW_DAYS: num(30),
  MIN_LEAD_MINUTES: num(30),
  FREE_CANCEL_HOURS: num(4),
  MAX_RESCHEDULES: num(2),
  PAYMENT_REQUIRED: bool(true),
  MEET_BASE_URL: z.string().default('https://meet.jit.si'),

  DELIVERY_FEE: num(40),
  FREE_DELIVERY_ABOVE: num(500),
  GST_PERCENT: num(12),

  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

  IMAGEKIT_PUBLIC_KEY: z.string().optional().default(''),
  IMAGEKIT_PRIVATE_KEY: z.string().optional().default(''),
  IMAGEKIT_URL_ENDPOINT: z.string().optional().default(''),

  EMAIL_ENABLED: bool(true),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: num(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('CarePulse <no-reply@carepulse.example>'),

  WHATSAPP_ENABLED: bool(true),
  WHATSAPP_PROVIDER: z.enum(['dryrun', 'meta', 'twilio']).default('dryrun'),
  WA_META_TOKEN: z.string().optional().default(''),
  WA_META_PHONE_ID: z.string().optional().default(''),
  WA_META_TEMPLATE_LANG: z.string().default('en'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default('whatsapp:+14155238886'),
  DEFAULT_COUNTRY_CODE: z.string().default('91'),

  SEED_ADMIN_EMAIL: z.string().default('admin@carepulse.local'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@12345'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const features = {
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  imagekit: Boolean(env.IMAGEKIT_PUBLIC_KEY && env.IMAGEKIT_PRIVATE_KEY && env.IMAGEKIT_URL_ENDPOINT),
  smtp: Boolean(env.SMTP_HOST),
};
