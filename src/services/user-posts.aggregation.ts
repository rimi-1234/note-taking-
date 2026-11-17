import { Types } from 'mongoose';
import { User } from '../models/index.js';
import { buildPaginatedResponse, type PaginationQuery } from '../lib/pagination.js';
import { paginationSkip } from '../lib/pagination.js';

export type UserPostsResult = {
  user: {
    _id: string;
    name: string;
    interests: string[];
  };
  data: Array<{
    _id: string;
    title: string;
    body: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AggRow = {
  _id: Types.ObjectId;
  name: string;
  interests: string[];
  result?: {
    data: Array<{
      _id: Types.ObjectId;
      title: string;
      body: string;
      author: Types.ObjectId;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: Array<{ n: number }>;
  };
};

export async function getUserPostsPage(
  userId: Types.ObjectId,
  pagination: PaginationQuery,
): Promise<UserPostsResult | null> {
  const skip = paginationSkip(pagination);

  const rows = await User.aggregate<AggRow>([
    { $match: { _id: userId } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'result',
        pipeline: [
          { $sort: { _id: -1 } },
          {
            $facet: {
              data: [{ $skip: skip }, { $limit: pagination.limit }],
              total: [{ $count: 'n' }],
            },
          },
        ],
      },
    },
    {
      $project: {
        name: 1,
        interests: 1,
        result: { $first: '$result' },
      },
    },
  ]);

  const row = rows[0];
  if (!row) return null;

  const total = row.result?.total[0]?.n ?? 0;
  const data = (row.result?.data ?? []).map((post) => ({
    _id: post._id.toString(),
    title: post.title,
    body: post.body,
    author: post.author.toString(),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }));

  return {
    user: {
      _id: row._id.toString(),
      name: row.name,
      interests: row.interests,
    },
    ...buildPaginatedResponse(data, pagination, total),
  };
}
