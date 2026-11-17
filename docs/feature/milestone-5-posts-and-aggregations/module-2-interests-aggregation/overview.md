# Overview - Interests aggregation

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds `GET /api/users/by-interest` (admin only): one `User.collection.aggregate()` call that starts with an index-backed `$match` on `interests`, unwinds, groups users per interest, sorts, and paginates the groups with `$facet`.

## What changes

| File | Change |
| --- | --- |
| `src/services/interests.aggregation.ts` | New |
| `src/routes/users.routes.ts` | Add `GET /api/users/by-interest` |
| `tests/interests.test.ts` | New |

## How it works

```mermaid
flowchart LR
    U[("users")] --> M["$match interests $gt ''<br/>IXSCAN interests_1"]
    M --> PR["$project name, email, interests"]
    PR --> UW["$unwind interests"]
    UW --> G["$group by interest<br/>count + users[]"]
    G --> S["$sort count desc, interest asc"]
    S --> F["$facet<br/>data: skip + limit<br/>total: $count"]
    F --> OUT(["{ data: [{ interest, count, users }], page, limit, total, totalPages }"])
```

## Where it fits

Part of [Milestone 5 - Posts and aggregations](../overview.md).
