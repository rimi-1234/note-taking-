import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface INote {
  title: string;
  content: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<INote>;
export type NoteModel = Model<INote>;

const noteSchema = new Schema<INote>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: '',
      maxlength: 10_000,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        delete out.__v;
        return out;
      },
    },
  },
);

// My-notes list/count, admin ?owner= filter, cascade delete (decision 23)
noteSchema.index({ owner: 1, _id: -1 });

export const Note = model<INote>('Note', noteSchema);
