import { AppError } from '../lib/errors.js';

export function demoReadOnly(): AppError {
  return new AppError(403, 'DEMO_READ_ONLY', 'Demo accounts cannot perform this action');
}
