# Overview - RBAC and profile

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds the `authenticate` middleware (verifies the Bearer token and reloads the user by `_id`, so deleted users and role changes take effect immediately), the `requireRole('admin')` guard, and the user's own profile endpoints.

## What changes

| File | Change |
| --- | --- |
| `src/middleware/authenticate.ts`, `require-role.ts` | New |
| `src/lib/object-id.ts` | New |
| `src/routes/me.routes.ts` | New |
| `tests/me.test.ts` | New |

## How it works

```mermaid
flowchart TD
    R(["Request with Authorization: Bearer token"]) --> V{"JWT valid and type = access?"}
    V -- no --> E401["401 UNAUTHENTICATED"]
    V -- yes --> F["User.findById(sub)<br/>built-in _id index"]
    F --> X{"user exists and tv matches tokenVersion?"}
    X -- no --> E401
    X -- yes --> U["req.user = { id, role }"]
    U --> G{"route needs admin?"}
    G -- no --> H["handler"]
    G -- yes --> A{"role = admin?"}
    A -- yes --> H
    A -- no --> E403["403 FORBIDDEN"]
```

## Where it fits

Part of [Milestone 2 - Auth](../overview.md).
