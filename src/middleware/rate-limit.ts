import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

const WINDOW_MS = 15 * 60 * 1000;

function limited(message: string) {
  return new AppError(429, 'RATE_LIMITED', message);
}

/**
 * Login attempts per IP + email (decision 18). Keying on the email too stops one account's
 * attempts from locking out everyone behind a shared IP (e.g. the frontend's API proxy).
 * Override with RATE_LIMIT_LOGIN_MAX for tests.
 */
export function createLoginLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 10),
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${ipKeyGenerator(req.ip ?? '')}:${email}`;
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(limited('Too many login attempts, try again later'));
    },
  });
}

/** Global API budget (decision 18). Override with RATE_LIMIT_GLOBAL_MAX for tests. */
export function createGlobalLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 300),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    handler: (_req, _res, next) => {
      next(limited('Too many requests, try again later'));
    },
  });
}
