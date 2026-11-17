import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import type { AuthUser } from '../types/auth.js';
import { User } from '../models/index.js';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get('Authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or revoked access token');
    }

    const authUser: AuthUser = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
};
