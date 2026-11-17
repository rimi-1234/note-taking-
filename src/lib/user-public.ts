import type { IUser } from '../models/user.model.js';
import type { Types } from 'mongoose';

export type PublicUser = {
  _id: string;
  name: string;
  email: string;
  role: IUser['role'];
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
};

type UserLike = Pick<IUser, 'name' | 'email' | 'role' | 'interests' | 'createdAt' | 'updatedAt'> & {
  _id: Types.ObjectId | string;
};

export function toPublicUser(user: UserLike): PublicUser {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    interests: user.interests,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
