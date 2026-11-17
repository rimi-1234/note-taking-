import { User } from '../models/index.js';
import {
  buildPaginatedResponse,
  paginationSkip,
  type PaginationQuery,
} from '../lib/pagination.js';

export type InterestGroup = {
  interest: string;
  count: number;
  users: Array<{ _id: string; name: string; email: string }>;
};

type FacetResult = {
  data: Array<{
    _id: string;
    count: number;
    users: Array<{ _id: { toString(): string }; name: string; email: string }>;
  }>;
  total: Array<{ n: number }>;
};

export async function getInterestsPage(
  pagination: PaginationQuery,
  interest?: string,
): Promise<ReturnType<typeof buildPaginatedResponse<InterestGroup>>> {
  const skip = paginationSkip(pagination);
  const match = interest
    ? { interests: interest.toLowerCase() }
    : { interests: { $gt: '' } };

  // Single aggregate() call only (decision / PDF scenario 1).
  const [facet] = await User.collection
    .aggregate<FacetResult>([
      { $match: match },
      { $project: { name: 1, email: 1, interests: 1 } },
      { $unwind: '$interests' },
      ...(interest
        ? [{ $match: { interests: interest.toLowerCase() } }]
        : []),
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pagination.limit }],
          total: [{ $count: 'n' }],
        },
      },
    ])
    .toArray();

  const total = facet?.total[0]?.n ?? 0;
  const data: InterestGroup[] = (facet?.data ?? []).map((group) => ({
    interest: group._id,
    count: group.count,
    users: group.users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
    })),
  }));

  return buildPaginatedResponse(data, pagination, total);
}
