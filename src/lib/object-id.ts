import { Types } from 'mongoose';
import { z } from 'zod';

/** Invalid ObjectIds fail validation with 400 (decision 17), not a CastError 500. */
export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), { message: 'Invalid id' })
  .transform((value) => new Types.ObjectId(value));

export const objectIdStringSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), { message: 'Invalid id' });
