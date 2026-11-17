import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Route'));
};

function isDuplicateKeyError(err: unknown): err is { code: number; keyValue?: Record<string, unknown> } {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    appError =
      field === 'email'
        ? new AppError(409, 'EMAIL_TAKEN', 'A user with this email already exists')
        : new AppError(409, 'DUPLICATE_KEY', `Duplicate value for ${field}`);
  } else if (err instanceof mongoose.Error.ValidationError) {
    appError = new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid data',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    appError = new AppError(400, 'VALIDATION_ERROR', `Invalid value for ${err.path}`);
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  } else if (err?.type === 'entity.too.large') {
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  } else {
    logger.error({ err, path: req.path }, 'Unhandled error');
    appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
    },
  });
};
