# Overview - Posts and $lookup

> **Status: done and verified** (2026-11-18). This describes what was actually built.

## In short

`POST /api/posts` and `DELETE /api/posts/:id` (author-scoped). `GET /api/users/:id/posts` runs one aggregation: `$match` user by `_id`, `$lookup` posts with `$sort` + `$facet` pagination inside the lookup (uses `author_1__id_-1`).

## What changed

| File | Change |
| --- | --- |
| `src/routes/posts.routes.ts` | Create + delete |
| `src/services/user-posts.aggregation.ts` | `$lookup` pipeline |
| `src/routes/users.routes.ts` | `GET /:id/posts` |
| `tests/posts.test.ts` | Newest-first, pagination, 404s |

## Where it fits

Part of [Milestone 5 - Posts and aggregations](../overview.md).
