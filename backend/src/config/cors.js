import { env } from './env.js';

const norm = (s) => s.trim().replace(/\/+$/, '');
// CLIENT_URL (e.g. http://localhost:5173) is always allowed, plus any extra CORS_ORIGINS.
const allowed = [...new Set([env.CLIENT_URL, ...env.CORS_ORIGINS.split(',')].map(norm).filter(Boolean))];

export const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true);
    const err = new Error(`Origin not allowed by CORS: ${origin}. Allowed: ${allowed.join(', ')}`);
    err.isCors = true;
    return cb(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
};
export const allowedOrigins = allowed;
