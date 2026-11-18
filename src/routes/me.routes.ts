import { Router } from 'express';
import { z } from 'zod';
import { clearRefreshCookie } from '../lib/cookies.js';
import { isDemoAccount } from '../lib/demo.js';
import { AppError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { toPublicUser } from '../lib/user-public.js';
import { authenticate } from '../middleware/authenticate.js';
import { demoReadOnly } from '../middleware/demo-guard.js';
import { validateBody } from '../middleware/validate.js';
import { User } from '../models/index.js';

const patchMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .superRefine((value, ctx) => {
    const changingPassword = value.newPassword !== undefined || value.currentPassword !== undefined;
    if (!changingPassword) return;

    if (!value.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Current password is required to set a new password',
      });
    }
    if (!value.newPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'New password is required',
      });
    }
  });

export function createMeRouter() {
  const router = Router();

  router.get('/me', authenticate, async (req, res, next) => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
      }
      res.status(200).json({ user: toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/me', authenticate, validateBody(patchMeSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof patchMeSchema>;
      if (body.newPassword !== undefined && isDemoAccount(req.user!.email)) {
        throw demoReadOnly();
      }
      const user = await User.findById(req.user!._id).select('+passwordHash');
      if (!user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
      }

      if (body.name !== undefined) {
        user.name = body.name;
      }
      if (body.interests !== undefined) {
        user.interests = body.interests;
      }

      let passwordChanged = false;
      if (body.newPassword !== undefined) {
        if (!user.passwordHash || !(await verifyPassword(body.currentPassword!, user.passwordHash))) {
          throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
        }
        user.passwordHash = await hashPassword(body.newPassword);
        user.tokenVersion += 1;
        passwordChanged = true;
      }

      await user.save();

      if (passwordChanged) {
        clearRefreshCookie(res);
      }

      res.status(200).json({ user: toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
