import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export const ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof ROLES)[number];

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  interests: string[];
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;
export type UserModel = Model<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'user',
      required: true,
    },
    interests: {
      type: [String],
      default: [],
      set: (values: string[]) =>
        [
          ...new Set(
            values
              .map((value) => value.trim().toLowerCase())
              .filter((value) => value.length > 0),
          ),
        ],
    },
    tokenVersion: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        delete out.passwordHash;
        delete out.__v;
        return out;
      },
    },
  },
);

// Login lookup + duplicate-email check (decision 23)
userSchema.index({ email: 1 }, { unique: true });
// Interests aggregation opening $match (decision 23)
userSchema.index({ interests: 1 });

export const User = model<IUser>('User', userSchema);

export type UserId = Types.ObjectId;
