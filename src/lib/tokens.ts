import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../models/user.model.js';
import { AppError } from './errors.js';

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  tv: number;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  tv: number;
  type: 'refresh';
};

type SignableUser = {
  _id: { toString(): string };
  role: UserRole;
  tokenVersion: number;
};

export function signAccessToken(user: SignableUser): string {
  const payload: AccessTokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    tv: user.tokenVersion,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    jwtid: randomUUID(),
  });
}

export function signRefreshToken(user: SignableUser): string {
  const payload: RefreshTokenPayload = {
    sub: user._id.toString(),
    tv: user.tokenVersion,
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    jwtid: randomUUID(),
  });
}

function asObject(payload: string | jwt.JwtPayload): jwt.JwtPayload {
  if (typeof payload === 'string' || payload === null || typeof payload !== 'object') {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid token');
  }
  return payload;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = asObject(jwt.verify(token, env.JWT_ACCESS_SECRET));
    if (payload.type !== 'access' || typeof payload.sub !== 'string' || typeof payload.tv !== 'number') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid access token');
    }
    if (payload.role !== 'user' && payload.role !== 'admin') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid access token');
    }
    return {
      sub: payload.sub,
      role: payload.role,
      tv: payload.tv,
      type: 'access',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = asObject(jwt.verify(token, env.JWT_REFRESH_SECRET));
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.tv !== 'number') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid refresh token');
    }
    return {
      sub: payload.sub,
      tv: payload.tv,
      type: 'refresh',
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired refresh token');
  }
}
