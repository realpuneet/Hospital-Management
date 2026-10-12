import { asyncHandler } from '../utils/asyncHandler.js';
import { created, noContent, ok } from '../utils/ApiResponse.js';
import * as auth from '../services/auth.service.js';
import * as tokens from '../services/token.service.js';

const meta = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });
const respond = (res, { user, accessToken, refreshToken }, status = 200, message = 'OK') => {
  tokens.setRefreshCookie(res, refreshToken);
  const body = { user, accessToken };
  return status === 201 ? created(res, body, message) : ok(res, body, message);
};

export const register = asyncHandler(async (req, res) => respond(res, await auth.register(req.body, meta(req)), 201, 'Account created'));
export const login = asyncHandler(async (req, res) => respond(res, await auth.login(req.body, meta(req)), 200, 'Logged in'));
export const otpRequest = asyncHandler(async (req, res) => ok(res, await auth.requestOtp(req.body), 'OTP sent'));
export const otpVerify = asyncHandler(async (req, res) => respond(res, await auth.verifyOtp(req.body, meta(req)), 200, 'Logged in'));

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await tokens.rotateRefreshToken(req.cookies?.[tokens.REFRESH_COOKIE], meta(req));
    tokens.setRefreshCookie(res, refreshToken);
    return ok(res, { user, accessToken });
  } catch (e) {
    tokens.clearRefreshCookie(res);
    throw e;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await tokens.revokeRefreshToken(req.cookies?.[tokens.REFRESH_COOKIE]);
  tokens.clearRefreshCookie(res);
  return noContent(res);
});

export const me = asyncHandler(async (req, res) => ok(res, req.user));
