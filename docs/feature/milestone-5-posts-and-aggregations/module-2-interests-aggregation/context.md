# Context - Interests aggregation

**Decisions applied:** 6 (lowercased interests), 12, 14, 23.

**Pipeline (runs on `users`, one `aggregate()` call)**

```js
[
  { $match: { interests: { $gt: '' } } },   // multikey index interests_1, bounds ("", {})
  { $project: { name: 1, email: 1, interests: 1 } },
  { $unwind: '$interests' },
  { $group: { _id: '$interests', count: { $sum: 1 },
              users: { $push: { _id: '$_id', name: '$name', email: '$email' } } } },
  { $sort: { count: -1, _id: 1 } },
  { $facet: { data: [{ $skip: skip }, { $limit: limit }],
              total: [{ $count: 'n' }] } }
]
```

**Why `$gt: ''`:** it matches any document whose `interests` array holds at least one non-empty string, and the planner can turn it into a bounded scan of the multikey `interests_1` index. Users without interests are never read. With `?interest=chess` the match becomes `{ interests: 'chess' }`, still on the same index.
