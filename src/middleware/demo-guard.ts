import type { RequestHandler } from 'express';
import { isDemoAccount } from '../lib/demo.js';
import { AppError } from '../lib/errors.js';

export function demoReadOnly(): AppError {
  return new AppError(403, 'DEMO_READ_ONLY', 'Demo accounts cannot perform this action');
}

/** Must run after `authenticate`. Public demo logins may browse but not manage accounts. */
export const blockDemoAccounts: RequestHandler = (req, _res, next) => {
  next(isDemoAccount(req.user?.email) ? demoReadOnly() : undefined);
};
