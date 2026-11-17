# Secure Notes - QA Guide

_Updated after each module. Last updated: 2026-11-18 02:36 (UTC+6)._

## Running the checks

```powershell
cd backend
npm install
copy .env.example .env   # then fill in MONGODB_URI and the two JWT secrets
npm run typecheck
npm test                 # integration tests against an in-memory MongoDB
npm run dev              # API on http://localhost:4000
```

> On Windows PowerShell, call `curl.exe` explicitly, because plain `curl` is an alias for `Invoke-WebRequest`.

## Scenarios by module

### M1 / Project setup

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Health check | `curl.exe -i http://localhost:4000/health` | `200`, `{"status":"ok","db":"up"}`, helmet headers present, no `X-Powered-By` |
| 2 | Unknown route | `curl.exe -i http://localhost:4000/api/nope` | `404`, `{"error":{"code":"NOT_FOUND","message":"Route not found"}}` |
| 3 | Malformed JSON | `curl.exe -X POST http://localhost:4000/api/x -H "Content-Type: application/json" --data-raw '{bad'` | `400`, `INVALID_JSON` |
| 4 | Disallowed origin | `curl.exe -H "Origin: https://evil.example" http://localhost:4000/health` | `403`, `CORS_NOT_ALLOWED` |
| 5 | Allowed preflight | `curl.exe -i -X OPTIONS http://localhost:4000/api/notes -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: PATCH" -H "Access-Control-Request-Headers: authorization,x-requested-with"` | `204`, `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Headers` includes `Authorization,X-Requested-With` |
| 6 | Missing config | Rename `.env`, then `npm run dev` | The process exits and lists `MONGODB_URI`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` |

Observed output on 2026-11-18: all six matched the expected results.

### M1 / Data models

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Sync indexes | `npm run sync-indexes` | Logs User/Note/Post synced |
| 2 | Seed admin | `npm run seed` | Upserts `ADMIN_EMAIL` as role `admin` |
| 3 | Seed demo | `npm run seed:demo` | 3 users, 4 notes, 4 posts (safe to rerun) |
| 4 | Index set on Atlas | Inspect collections in Atlas or script | users: `_id_`, `email_1` unique, `interests_1`; notes: `_id_`, `owner_1__id_-1`; posts: `_id_`, `author_1__id_-1` |

Observed on Atlas `secure-notes` (2026-11-18): indexes exact; counts `{ users: 4, notes: 4, posts: 4 }`.

### M2 / Auth core

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Login | `POST /api/auth/login` with admin email/password | `200` + `accessToken` + `Set-Cookie: refreshToken` |
| 2 | Bad password | Same with wrong password | `401 INVALID_CREDENTIALS` "Invalid credentials" |
| 3 | Refresh | `POST /api/auth/refresh` with cookie + `X-Requested-With` | `200` + new access token + rotated cookie |
| 4 | CSRF missing | Refresh without `X-Requested-With` | `403 CSRF_REJECTED` |
| 5 | Logout then refresh | Logout, then refresh with old cookie | Logout `204`; refresh `401 UNAUTHENTICATED` |

### M2 / RBAC and profile

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Profile | `GET /api/users/me` with Bearer | `200 { user }` |
| 2 | No token | Same without Authorization | `401 UNAUTHENTICATED` |
| 3 | Update profile | `PATCH /api/users/me` `{ name, interests }` | `200` with updated fields (interests lowercased) |
| 4 | Change password | `PATCH` with `currentPassword` + `newPassword` | `200`; old access token then `401`; must log in again |

### M3 / Notes CRUD

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Create | `POST /api/notes` `{ title, content }` | `201 { note }` |
| 2 | List mine | `GET /api/notes?page=1&limit=20` | `{ data, page, limit, total, totalPages }` |
| 3 | Other user's note | `GET/PATCH/DELETE` their id as another user | `404 NOT_FOUND` |
| 4 | Admin read vs write | Admin `GET` ok; admin `PATCH/DELETE` another's note | GET `200`; mutate `404` |

### M3 / Admin notes

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | All notes | `GET /api/admin/notes` as admin | Paginated list; owner has `name` + `email` |
| 2 | Filter | `?owner=<userId>` | Only that user's notes |
| 3 | Non-admin | Same as regular user | `403 FORBIDDEN` |

### M4 / Admin users

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | Create user | `POST /api/admin/users` | `201 { user }` |
| 2 | Duplicate email | Same email twice | `409 EMAIL_TAKEN` |
| 3 | Self-delete | Delete own id (with 2+ admins) | `400 CANNOT_MODIFY_SELF` |
| 4 | Last admin | Demote/delete sole admin | `409 LAST_ADMIN` |
| 5 | Cascade | Delete user who has notes/posts | `204`; notes and posts gone |

### M5 / Posts and aggregations

| # | Scenario | Command | Expected |
| --- | --- | --- | --- |
| 1 | User posts | `GET /api/users/:id/posts` | `{ user, data, page, limit, total, totalPages }` newest first |
| 2 | Create/delete post | `POST /api/posts`, `DELETE /api/posts/:id` | Create `201`; other author's delete `404` |
| 3 | Interests | `GET /api/users/by-interest` as admin | Groups with counts; empty-interest users excluded |
| 4 | Explain | `npm run explain` | PASS, no COLLSCAN; indexes match decision 23 |

## Edge-case checklist

- [x] Internal errors return a generic 500 and never leak the message (automated test)
- [ ] Body larger than 100 KB returns 413 `PAYLOAD_TOO_LARGE` (mapped in the error handler, not exercised yet; will be covered once there's a POST route in auth)
- [x] Duplicate email hits unique index (`11000`)
- [x] Interests are lowercased, trimmed, and de-duplicated
- [x] `passwordHash` is omitted from default queries and `toJSON`
- [x] Wrong email and wrong password share the same `INVALID_CREDENTIALS` message
- [x] Refresh/logout require `X-Requested-With`
- [x] Logout bumps `tokenVersion` and invalidates the refresh cookie
- [x] Login rate limit returns `429 RATE_LIMITED`
- [x] Startup refuses identical access and refresh secrets
