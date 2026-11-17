import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface IPost {
  title: string;
  body: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<IPost>;
export type PostModel = Model<IPost>;

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 10_000,
    },
    author: {
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

// $lookup posts-by-user, count, cascade delete (decision 23)
postSchema.index({ author: 1, _id: -1 });

export const Post = model<IPost>('Post', postSchema);
