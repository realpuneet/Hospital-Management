import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = details[0]?.message || 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'BAD_ID';
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = field === 'doctor' || field === 'startAt' ? 'That slot was just taken' : `${field} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_JSON';
    message = 'Malformed JSON body';
  } else if (err.isCors || String(err.message).startsWith('Origin not allowed by CORS')) {
    status = 403;
    code = 'CORS';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Session expired, please log in again';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    status = 401;
    code = 'TOKEN_INVALID';
    message = 'Invalid authentication token';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (err.name === 'ZodError') {
    status = 422;
    code = 'VALIDATION_ERROR';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    message = details[0]?.message || 'Validation failed';
  } else if (/^Mongo(ServerSelection|Network|NotConnected)/.test(err.name) || err.name === 'MongooseServerSelectionError') {
    status = 503;
    code = 'DB_UNAVAILABLE';
    message = 'Database is unavailable, please try again shortly';
  } else if (err.name === 'MaxRetriesPerRequestError' || err.code === 'ECONNREFUSED') {
    status = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'A required service is unavailable, please try again shortly';
  } else if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  const requestId = req.id;
  const meta = { code, status, method: req.method, path: req.originalUrl, requestId, userId: req.user?.id || req.user?._id };
  if (status >= 500) logger.error({ ...meta, err }, `unhandled error: ${err.message}`);
  else logger.warn({ ...meta, reason: message }, 'request failed');

  const body = { success: false, message: status >= 500 && isProd ? 'Internal server error' : message, code, requestId };
  if (details) body.details = details;
  if (!isProd && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
}
