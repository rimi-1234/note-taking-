# Overview - Admin users

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds the five `/api/admin/users` endpoints. Deleting a user also deletes their notes and posts; admins cannot delete or demote themselves, and the last admin can never be removed or demoted.

## What changes

| File | Change |
| --- | --- |
| `src/routes/admin-users.routes.ts` | New |
| `src/app.ts` | Mount `/api/admin/users` |
| `tests/admin-users.test.ts` | New |

## How it works

```mermaid
flowchart TD
    D(["DELETE /api/admin/users/:id"]) --> S{"target is me?"}
    S -- yes --> E1["400 CANNOT_MODIFY_SELF"]
    S -- no --> F["findById(id)"]
    F --> X{"exists?"}
    X -- no --> E404["404 NOT_FOUND"]
    X -- yes --> A{"target is admin and is the last admin?"}
    A -- yes --> E2["409 LAST_ADMIN"]
    A -- no --> DEL["delete user"]
    DEL --> N["Note.deleteMany({owner}) via owner_1__id_-1"]
    DEL --> P["Post.deleteMany({author}) via author_1__id_-1"]
    N --> OK["204"]
    P --> OK
```

## Where it fits

Part of [Milestone 4 - User management](../overview.md).
