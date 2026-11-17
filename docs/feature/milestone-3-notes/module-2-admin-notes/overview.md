# Overview - Admin notes

> **Status: done and verified** (2026-11-18). This describes what was actually built.

## In short

`GET /api/admin/notes` is an admin-only paginated newest-first list of every note, with optional `?owner=` (ObjectId). Unfiltered lists use the built-in `_id` index and `estimatedDocumentCount()`; filtered lists reuse `owner_1__id_-1`. Owner `name`/`email` are populated for the table. No new index.

## What changed

| File | Change |
| --- | --- |
| `src/routes/admin-notes.routes.ts` | Admin list + optional owner filter + populate |
| `src/app.ts` | Mount `/api/admin/notes` |
| `tests/admin-notes.test.ts` | Admin ok, filter, 403 for users |

## How it works

```mermaid
flowchart TD
    R(["GET /api/admin/notes?page&limit&owner"]) --> AUTH["authenticate + requireRole admin"]
    AUTH --> Q{"owner given?"}
    Q -- no --> A["find({}).sort({_id:-1})<br/>uses built-in _id index"]
    Q -- yes --> B["find({owner}).sort({_id:-1})<br/>uses owner_1__id_-1"]
    A --> P["populate owner name/email via _id"]
    B --> P
    P --> OUT["{ data, page, limit, total, totalPages }"]
```

## Where it fits

Part of [Milestone 3 - Notes](../overview.md). Milestone 3 complete. Next: [Milestone 4 - User management](../../milestone-4-user-management/overview.md).
