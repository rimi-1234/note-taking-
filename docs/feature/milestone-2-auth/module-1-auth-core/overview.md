# Overview - Auth core

> **Status: planned.** This file is rewritten with the real details when the module passes verification.

## In short

Adds password hashing, JWT signing and verification, and the three auth endpoints. Login sets an httpOnly refresh cookie and returns an access token; refresh rotates the cookie; logout bumps `tokenVersion` so every outstanding token for that user dies.

## What changes

| File | Change |
| --- | --- |
| `src/lib/password.ts`, `src/lib/tokens.ts`, `src/lib/cookies.ts` | New |
| `src/middleware/validate.ts`, `csrf.ts`, `rate-limit.ts` | New |
| `src/routes/auth.routes.ts` | New |
| `src/app.ts` | Mount `/api/auth` and the global limiter |
| `tests/auth.test.ts` | New |

## How it works

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant API as Express API
    participant DB as MongoDB (users)
    B->>API: POST /api/auth/login {email, password}
    API->>DB: findOne({ email }) uses email_1
    DB-->>API: user + passwordHash
    API->>API: bcrypt.compare
    API-->>B: 200 { accessToken } + Set-Cookie refreshToken (httpOnly)
    Note over B: access token kept in memory only
    B->>API: POST /api/auth/refresh (cookie, X-Requested-With)
    API->>DB: findById(sub) uses _id
    API->>API: token tv == user.tokenVersion ?
    API-->>B: 200 { new accessToken } + rotated cookie
    B->>API: POST /api/auth/logout
    API->>DB: $inc tokenVersion
    API-->>B: 204 + cookie cleared (all old tokens now invalid)
```

## Where it fits

Part of [Milestone 2 - Auth](../overview.md).
