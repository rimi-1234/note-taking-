import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';

const WINDOW_MS = 15 * 60 * 1000;

function limited(message: string) {
  return new AppError(429, 'RATE_LIMITED', message);
}

/** Per-IP login attempts (decision 18). Override with RATE_LIMIT_LOGIN_MAX for tests. */
export function createLoginLimiter() {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 10),
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
