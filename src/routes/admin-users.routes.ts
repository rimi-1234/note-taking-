import { Router } from 'express';
import { z } from 'zod';
import { AppError, notFound } from '../lib/errors.js';
import { objectIdStringSchema } from '../lib/object-id.js';
import {
  buildPaginatedResponse,
  paginationQuerySchema,
  paginationSkip,
} from '../lib/pagination.js';
import { hashPassword } from '../lib/password.js';
import { toPublicUser } from '../lib/user-public.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { Note, Post, User } from '../models/index.js';
import { ROLES } from '../models/user.model.js';

const userIdParams = z.object({
  id: objectIdStringSchema,
});

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLES).default('user'),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((v) => v.toLowerCase())
      .optional(),
    role: z.enum(ROLES).optional(),
    interests: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.role !== undefined ||
      value.interests !== undefined ||
      value.password !== undefined,
    { message: 'At least one field is required' },
  );

async function assertCanRemoveAdminRole(targetRole: string): Promise<void> {
  if (targetRole !== 'admin') return;
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount <= 1) {
    throw new AppError(409, 'LAST_ADMIN', 'Cannot remove or demote the last admin');
  }
}

export function createAdminUsersRouter() {
  const router = Router();

  router.use(authenticate, requireRole('admin'));

  router.get('/', validateQuery(paginationQuerySchema), async (req, res, next) => {
    try {
      const query = (req as typeof req & { validatedQuery: z.infer<typeof paginationQuerySchema> })
        .validatedQuery;

      const [users, total] = await Promise.all([
        User.find({})
          .sort({ _id: -1 })
          .skip(paginationSkip(query))
          .limit(query.limit)
          .lean(),
        User.estimatedDocumentCount(),
      ]);

      res.status(200).json(buildPaginatedResponse(users.map(toPublicUser), query, total));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', validateBody(createUserSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createUserSchema>;
      const user = await User.create({
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: body.role,
        interests: body.interests,
      });

      res.status(201).json({ user: toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', validateParams(userIdParams), async (req, res, next) => {
    try {
      const { id } = (req as typeof req & { validatedParams: z.infer<typeof userIdParams> })
        .validatedParams;
      const user = await User.findById(id).lean();
      if (!user) throw notFound('User');
      res.status(200).json({ user: toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/:id',
    validateParams(userIdParams),
    validateBody(updateUserSchema),
    async (req, res, next) => {
      try {
        const { id } = (req as typeof req & { validatedParams: z.infer<typeof userIdParams> })
          .validatedParams;
        const body = req.body as z.infer<typeof updateUserSchema>;
        const isSelf = id === req.user!.id;
        const demoting = body.role !== undefined && body.role !== 'admin';

        const user = await User.findById(id).select('+passwordHash');
        if (!user) throw notFound('User');

        if (demoting && user.role === 'admin') {
          await assertCanRemoveAdminRole(user.role);
        }

        if (isSelf && body.role !== undefined && body.role !== user.role) {
          throw new AppError(400, 'CANNOT_MODIFY_SELF', 'You cannot change your own role');
        }

        if (body.name !== undefined) user.name = body.name;
        if (body.email !== undefined) user.email = body.email;
        if (body.interests !== undefined) user.interests = body.interests;

        let bumpTokenVersion = false;
        if (body.role !== undefined && body.role !== user.role) {
          user.role = body.role;
          bumpTokenVersion = true;
        }
        if (body.password !== undefined) {
          user.passwordHash = await hashPassword(body.password);
          bumpTokenVersion = true;
        }
        if (bumpTokenVersion) {
          user.tokenVersion += 1;
        }

        await user.save();
        res.status(200).json({ user: toPublicUser(user) });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete('/:id', validateParams(userIdParams), async (req, res, next) => {
    try {
      const { id } = (req as typeof req & { validatedParams: z.infer<typeof userIdParams> })
        .validatedParams;
      const isSelf = id === req.user!.id;

      const user = await User.findById(id);
      if (!user) throw notFound('User');

      // Last-admin check first so the sole admin gets LAST_ADMIN (decision 16).
      await assertCanRemoveAdminRole(user.role);

      if (isSelf) {
        throw new AppError(400, 'CANNOT_MODIFY_SELF', 'You cannot delete your own account');
      }

      await user.deleteOne();
      await Promise.all([
        Note.deleteMany({ owner: user._id }),
        Post.deleteMany({ author: user._id }),
      ]);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
