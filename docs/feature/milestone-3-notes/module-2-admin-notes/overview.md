# Overview - Admin notes

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds `GET /api/admin/notes`, a paginated newest-first list of every note with an optional `?owner=` filter. Without the filter it walks the built-in `_id` index; with it, it reuses the owner index. No new index is created.

## What changes

| File | Change |
| --- | --- |
| `src/routes/admin-notes.routes.ts` | New |
| `src/app.ts` | Mount `/api/admin/notes` |
| `tests/admin-notes.test.ts` | New |

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

Part of [Milestone 3 - Notes](../overview.md).
