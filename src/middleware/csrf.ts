import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

/** Lightweight CSRF check for cookie-authenticated browser requests (decision 11). */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  const header = req.get('X-Requested-With');
  if (!header) {
    next(new AppError(403, 'CSRF_REJECTED', 'Missing X-Requested-With header'));
    return;
  }
  next();
};
