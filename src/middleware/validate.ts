import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors.js';

function formatIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.') || '(root)',
    message: issue.message,
  }));
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', formatIssues(parsed.error)));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters', formatIssues(parsed.error)));
      return;
    }
    // Express types query as ParsedQs; validated data is attached for handlers to use.
    (req as typeof req & { validatedQuery: T }).validatedQuery = parsed.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      next(new AppError(400, 'VALIDATION_ERROR', 'Invalid path parameters', formatIssues(parsed.error)));
      return;
    }
    (req as typeof req & { validatedParams: T }).validatedParams = parsed.data;
    next();
  };
}
