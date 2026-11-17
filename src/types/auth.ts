import type { Types } from 'mongoose';
import type { UserRole } from '../models/user.model.js';

export type AuthUser = {
  id: string;
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};
