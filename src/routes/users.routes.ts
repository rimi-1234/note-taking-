import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { objectIdStringSchema } from '../lib/object-id.js';
import { paginationQuerySchema } from '../lib/pagination.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { getInterestsPage } from '../services/interests.aggregation.js';
import { getUserPostsPage } from '../services/user-posts.aggregation.js';

const userIdParams = z.object({
  id: objectIdStringSchema,
});

const interestsQuerySchema = paginationQuerySchema.extend({
  interest: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .transform((v) => v.toLowerCase())
    .optional(),
});

export function createUsersRouter() {
  const router = Router();

  router.get(
    '/by-interest',
    authenticate,
    requireRole('admin'),
    validateQuery(interestsQuerySchema),
    async (req, res, next) => {
      try {
        const query = (
          req as typeof req & { validatedQuery: z.infer<typeof interestsQuerySchema> }
        ).validatedQuery;
        const result = await getInterestsPage(query, query.interest);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/:id/posts',
    authenticate,
    validateParams(userIdParams),
    validateQuery(paginationQuerySchema),
    async (req, res, next) => {
      try {
        const { id } = (req as typeof req & { validatedParams: z.infer<typeof userIdParams> })
          .validatedParams;
        const query = (
          req as typeof req & { validatedQuery: z.infer<typeof paginationQuerySchema> }
        ).validatedQuery;

        const result = await getUserPostsPage(new Types.ObjectId(id), query);
        if (!result) {
          throw notFound('User');
        }

        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
