# Overview - Notes CRUD

> **Status: done and verified** (2026-11-18). This describes what was actually built.

## In short

Shared pagination (`page`/`limit`, cap 100) plus five note endpoints. Lists and counts use `{ owner }` with `owner_1__id_-1`. Writes always include `owner: me` in the filter so another user's note (or an admin editing someone else's) returns `404` without leaking existence. Admins may `GET` any note by `_id`.

## What changed

| File | Change |
| --- | --- |
| `src/lib/pagination.ts` | Query schema + `{ data, page, limit, total, totalPages }` |
| `src/routes/notes.routes.ts` | CRUD under `/api/notes` |
| `src/app.ts` | Mount notes router |
| `tests/notes.test.ts` | Owner scope, admin read-only, pagination, validation |

## How it works

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as /api/notes
    participant DB as notes collection
    B->>API: GET /api/notes?page=2&limit=20
    API->>API: authenticate + validate query
    par list
        API->>DB: find({owner}).sort({_id:-1}).skip(20).limit(20)
    and count
        API->>DB: countDocuments({owner})
    end
    Note over DB: both use IXSCAN on owner_1__id_-1
    DB-->>API: notes + total
    API-->>B: { data, page: 2, limit: 20, total, totalPages }
    B->>API: PATCH /api/notes/:id
    API->>DB: findOneAndUpdate({_id, owner: me})
    DB-->>API: null when not mine
    API-->>B: 404 NOT_FOUND
```

## Where it fits

Part of [Milestone 3 - Notes](../overview.md). Next: [Admin notes list](../module-2-admin-notes/overview.md).
