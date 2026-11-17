# Secure Notes - QA Guide

_Updated after each module. Last updated: 2026-11-18 01:30 (UTC+6)._

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

## Edge-case checklist

- [x] Internal errors return a generic 500 and never leak the message (automated test)
- [ ] Body larger than 100 KB returns 413 `PAYLOAD_TOO_LARGE` (mapped in the error handler, not exercised yet; will be covered once there's a POST route in auth)
- [x] Duplicate email hits unique index (`11000`)
- [x] Interests are lowercased, trimmed, and de-duplicated
- [x] `passwordHash` is omitted from default queries and `toJSON`
- [x] Startup refuses identical access and refresh secrets
