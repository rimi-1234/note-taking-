import { Router } from 'express';
import { z } from 'zod';
import { objectIdStringSchema } from '../lib/object-id.js';
import {
  buildPaginatedResponse,
  paginationQuerySchema,
  paginationSkip,
} from '../lib/pagination.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validateQuery } from '../middleware/validate.js';
import { Note } from '../models/index.js';

const adminNotesQuerySchema = paginationQuerySchema.extend({
  owner: objectIdStringSchema.optional(),
});

type OwnerPopulated = {
  _id: { toString(): string };
  name: string;
  email: string;
};

function toAdminNoteJson(note: {
  _id: { toString(): string };
  title: string;
  content: string;
  owner: OwnerPopulated | { toString(): string };
  createdAt: Date;
  updatedAt: Date;
}) {
  const owner =
    note.owner && typeof note.owner === 'object' && 'email' in note.owner
      ? {
          _id: note.owner._id.toString(),
          name: note.owner.name,
          email: note.owner.email,
        }
      : { _id: String(note.owner), name: null, email: null };

  return {
    _id: note._id.toString(),
    title: note.title,
    content: note.content,
    owner,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function createAdminNotesRouter() {
  const router = Router();

  router.use(authenticate, requireRole('admin'));

  router.get('/', validateQuery(adminNotesQuerySchema), async (req, res, next) => {
    try {
      const query = (req as typeof req & { validatedQuery: z.infer<typeof adminNotesQuerySchema> })
        .validatedQuery;

      const filter = query.owner ? { owner: query.owner } : {};
      const findQuery = Note.find(filter)
        .sort({ _id: -1 })
        .skip(paginationSkip(query))
        .limit(query.limit)
        .populate<{ owner: OwnerPopulated }>('owner', 'name email')
        .lean();

      const [notes, total] = await Promise.all([
        findQuery,
        query.owner ? Note.countDocuments(filter) : Note.estimatedDocumentCount(),
      ]);

      res.status(200).json(buildPaginatedResponse(notes.map(toAdminNoteJson), query, total));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
