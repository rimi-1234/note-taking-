# Overview - Notes CRUD

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds the shared pagination helper and the five note endpoints. Every write is scoped to the owner in the query itself, so a user (or admin) touching someone else's note simply gets 404.

## What changes

| File | Change |
| --- | --- |
| `src/lib/pagination.ts` | New |
| `src/routes/notes.routes.ts` | New |
| `src/app.ts` | Mount `/api/notes` |
| `tests/notes.test.ts` | New |

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
    API-->>B: 404 NOT_FOUND (never reveals the note exists)
```

## Where it fits

Part of [Milestone 3 - Notes](../overview.md).
