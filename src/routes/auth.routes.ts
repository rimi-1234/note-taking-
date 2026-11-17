import { Router } from 'express';
import { z } from 'zod';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from '../lib/cookies.js';
import { AppError } from '../lib/errors.js';
import { verifyPassword } from '../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/tokens.js';
import { toPublicUser } from '../lib/user-public.js';
import { requireCsrfHeader } from '../middleware/csrf.js';
import { createLoginLimiter } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';
import { User } from '../models/index.js';

const loginSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');

export function createAuthRouter() {
  const router = Router();
  const loginLimiter = createLoginLimiter();

  router.post(
    '/login',
    loginLimiter,
    validateBody(loginSchema),
    async (req, res, next) => {
      try {
        const { email, password } = req.body as z.infer<typeof loginSchema>;
        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user?.passwordHash) {
          throw invalidCredentials();
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          throw invalidCredentials();
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        setRefreshCookie(res, refreshToken);

        res.status(200).json({
          accessToken,
          user: toPublicUser(user),
        });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/refresh', requireCsrfHeader, async (req, res, next) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE_NAME];
      if (typeof raw !== 'string' || raw.length === 0) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token missing');
      }

      const payload = verifyRefreshToken(raw);
      const user = await User.findById(payload.sub);
      if (!user || user.tokenVersion !== payload.tv) {
        clearRefreshCookie(res);
        throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token revoked or invalid');
      }

      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);
      setRefreshCookie(res, refreshToken);

      res.status(200).json({
        accessToken,
        user: toPublicUser(user),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', requireCsrfHeader, async (req, res, next) => {
    try {
      const raw = req.cookies?.[REFRESH_COOKIE_NAME];
      if (typeof raw === 'string' && raw.length > 0) {
        try {
          const payload = verifyRefreshToken(raw);
          await User.updateOne({ _id: payload.sub }, { $inc: { tokenVersion: 1 } });
        } catch {
          // Cookie may already be invalid; still clear it below.
        }
      }

      clearRefreshCookie(res);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
