import { Router } from 'express';
import { z } from 'zod';
import { notFound } from '../lib/errors.js';
import { objectIdStringSchema } from '../lib/object-id.js';
import {
  buildPaginatedResponse,
  paginationQuerySchema,
  paginationSkip,
} from '../lib/pagination.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { Note } from '../models/index.js';

const noteIdParams = z.object({
  id: objectIdStringSchema,
});

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10_000).default(''),
});

const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(10_000).optional(),
  })
  .refine((value) => value.title !== undefined || value.content !== undefined, {
    message: 'At least one of title or content is required',
  });

function toNoteJson(note: {
  _id: { toString(): string };
  title: string;
  content: string;
  owner: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: note._id.toString(),
    title: note.title,
    content: note.content,
    owner: note.owner.toString(),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function createNotesRouter() {
  const router = Router();

  router.use(authenticate);

  router.get('/', validateQuery(paginationQuerySchema), async (req, res, next) => {
    try {
      const query = (req as typeof req & { validatedQuery: z.infer<typeof paginationQuerySchema> })
        .validatedQuery;
      const filter = { owner: req.user!._id };
      const [notes, total] = await Promise.all([
        Note.find(filter)
          .sort({ _id: -1 })
          .skip(paginationSkip(query))
          .limit(query.limit)
          .lean(),
        Note.countDocuments(filter),
      ]);

      res.status(200).json(buildPaginatedResponse(notes.map(toNoteJson), query, total));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', validateBody(createNoteSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createNoteSchema>;
      const note = await Note.create({
        title: body.title,
        content: body.content,
        owner: req.user!._id,
      });
      res.status(201).json({ note: toNoteJson(note) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', validateParams(noteIdParams), async (req, res, next) => {
    try {
      const { id } = (req as typeof req & { validatedParams: z.infer<typeof noteIdParams> })
        .validatedParams;

      const note =
        req.user!.role === 'admin'
          ? await Note.findById(id).lean()
          : await Note.findOne({ _id: id, owner: req.user!._id }).lean();

      if (!note) {
        throw notFound('Note');
      }

      res.status(200).json({ note: toNoteJson(note) });
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/:id',
    validateParams(noteIdParams),
    validateBody(updateNoteSchema),
    async (req, res, next) => {
      try {
        const { id } = (req as typeof req & { validatedParams: z.infer<typeof noteIdParams> })
          .validatedParams;
        const body = req.body as z.infer<typeof updateNoteSchema>;

        // Always scope writes to the caller — admins cannot edit others' notes (decision 15).
        const note = await Note.findOneAndUpdate(
          { _id: id, owner: req.user!._id },
          { $set: body },
          { returnDocument: 'after', runValidators: true },
        ).lean();

        if (!note) {
          throw notFound('Note');
        }

        res.status(200).json({ note: toNoteJson(note) });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete('/:id', validateParams(noteIdParams), async (req, res, next) => {
    try {
      const { id } = (req as typeof req & { validatedParams: z.infer<typeof noteIdParams> })
        .validatedParams;

      const note = await Note.findOneAndDelete({ _id: id, owner: req.user!._id }).lean();
      if (!note) {
        throw notFound('Note');
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
