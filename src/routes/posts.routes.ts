import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { objectIdStringSchema } from '../lib/object-id.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { Post } from '../models/index.js';

const postIdParams = z.object({
  id: objectIdStringSchema,
});

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
});

function toPostJson(post: {
  _id: { toString(): string };
  title: string;
  body: string;
  author: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: post._id.toString(),
    title: post.title,
    body: post.body,
    author: post.author.toString(),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function createPostsRouter() {
  const router = Router();

  router.use(authenticate);

  router.post('/', validateBody(createPostSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createPostSchema>;
      const post = await Post.create({
        title: body.title,
        body: body.body,
        author: req.user!._id,
      });
      res.status(201).json({ post: toPostJson(post) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', validateParams(postIdParams), async (req, res, next) => {
    try {
      const { id } = (req as typeof req & { validatedParams: z.infer<typeof postIdParams> })
        .validatedParams;

      const post = await Post.findOneAndDelete({ _id: id, author: req.user!._id }).lean();
      if (!post) {
        throw notFound('Post');
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
