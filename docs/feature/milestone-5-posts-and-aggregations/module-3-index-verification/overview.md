# Overview - Index verification

> **Status: done and verified** (2026-11-18). This describes what was actually built.

## In short

`npm run explain` seeds sample data, runs `explain('executionStats')` on every API query/aggregation shape (including `$lookup` sub-plans), fails on `COLLSCAN`, and checks the DB index inventory matches decision 23. Allowed exceptions (`estimatedDocumentCount`, last-admin role count) are printed explicitly.

## What changed

| File | Change |
| --- | --- |
| `scripts/explain.ts` | Explain walker + index inventory |
| `package.json` | `explain` script |
| `tests/explain.test.ts` | Asserts no COLLSCAN in CI |

## Where it fits

Part of [Milestone 5 - Posts and aggregations](../overview.md). Milestone 5 complete. Next: [Milestone 6 - Frontend](../../milestone-6-frontend/overview.md).
