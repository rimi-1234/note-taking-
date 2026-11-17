# Overview - Interests aggregation

> **Status: done and verified** (2026-11-18). This describes what was actually built.

## In short

`GET /api/users/by-interest` (admin only): one `User.collection.aggregate()` starting with `$match` on `interests` (`$gt: ''` or equality filter), then unwind → group → sort → `$facet` pagination.

## What changed

| File | Change |
| --- | --- |
| `src/services/interests.aggregation.ts` | Single aggregate pipeline |
| `src/routes/users.routes.ts` | `GET /by-interest` |
| `tests/interests.test.ts` | Groups, filter, 403 |

## Where it fits

Part of [Milestone 5 - Posts and aggregations](../overview.md).
