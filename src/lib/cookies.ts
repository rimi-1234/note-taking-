import type { CookieOptions, Response } from 'express';
import { isProduction } from '../config/env.js';
import { REFRESH_TOKEN_TTL_SECONDS } from './tokens.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(),
    maxAge: undefined,
  });
}
