# Context - Posts and $lookup

**Decisions applied:** 3, 12, 23.

**Pipeline (runs on `users`)**

```js
[
  { $match: { _id: userId } },                       // built-in _id index
  { $lookup: {
      from: 'posts', localField: '_id', foreignField: 'author', as: 'result',
      pipeline: [
        { $sort: { _id: -1 } },                      // with author equality -> author_1__id_-1
        { $facet: {
            data:  [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'n' }] } }
      ] } },
  { $project: { name: 1, interests: 1, result: { $first: '$result' } } }
]
```

The `localField`/`foreignField` equality plus the `$sort` on `_id` is answered by `{ author: 1, _id: -1 }`, so each lookup is an index scan, not a collection scan.
