# Secure Notes — Backend

REST API for the Care Guide BD interview task: a note-taking app with JWT authentication and role-based access control.

- **Live API:** https://note-taking-backend-rouge.vercel.app (`GET /health`)
- **Live frontend:** https://note-taking-frontend-drab.vercel.app
- **Stack:** Node 20+, Express 5, TypeScript, MongoDB + Mongoose, JWT (`jsonwebtoken`), bcrypt (`bcryptjs`, cost 12), zod, vitest

## Demo logins

| Role  | Email                   | Password     |
| ----- | ----------------------- | ------------ |
| Admin | `admin@example.com`     | `Demo12345!` |
| User  | `demo-user@example.com` | `Demo12345!` |

Other seeded users: `alice@example.com`, `bob@example.com`, `carol@example.com`, all with password `Demo12345!`.

Both demo accounts are public, so nobody can change their password, email or role, or delete them. Everything else works normally.

## Run locally

```bash
cp .env.example .env        # fill in MONGODB_URI and the two JWT secrets
npm install
npm run sync-indexes        # builds exactly the indexes declared with schema.index()
npm run seed:demo           # admin + demo users, notes and posts (safe to rerun)
npm run dev                 # http://localhost:4000
```

| Script                 | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `npm test`             | 55 integration tests against an in-memory MongoDB           |
| `npm run typecheck`    | TypeScript check                                            |
| `npm run explain`      | Runs `explain()` on every query and fails on a `COLLSCAN`   |
| `npm run seed`         | Creates/updates one admin from `ADMIN_*` env vars           |

## Roles

| Capability                                   | User | Admin |
| -------------------------------------------- | :--: | :---: |
| Create, list, read, update, delete own notes |  ✓   |   ✓   |
| Write posts, read anyone's posts             |  ✓   |   ✓   |
| List, add, update, remove users              |      |   ✓   |
| View everyone's notes                        |      |   ✓   |
| View users grouped by interest               |      |   ✓   |

Admins can read every note but can only edit or delete their own. An admin cannot delete or demote itself, or the last remaining admin.

## Authentication

- `POST /api/auth/login` returns a 15-minute **access token** (sent as `Authorization: Bearer …`) and sets a 7-day **refresh token** in an `httpOnly` cookie scoped to `/api/auth`.
- `POST /api/auth/refresh` rotates both tokens. `POST /api/auth/logout` clears the cookie. Both require the `X-Requested-With` header as a CSRF guard.
- Each user has a `tokenVersion`. Changing a password or role bumps it, which revokes all existing tokens immediately.
- Login is rate-limited per IP address and email; all routes have a global rate limit.

## Endpoints

All list endpoints are paginated with `?page=1&limit=20` (default 20, max 100) and return `{ data, page, limit, total, totalPages }`.

| Method                 | Path                          | Access | Notes                                    |
| ---------------------- | ----------------------------- | ------ | ---------------------------------------- |
| POST                   | `/api/auth/login`             | public |                                          |
| POST                   | `/api/auth/refresh`           | cookie |                                          |
| POST                   | `/api/auth/logout`            | cookie |                                          |
| GET / PATCH            | `/api/users/me`               | user   | profile, interests, password             |
| GET / POST             | `/api/notes`                  | user   | own notes, paginated                     |
| GET / PATCH / DELETE   | `/api/notes/:id`              | user   | admins may GET any note                  |
| POST                   | `/api/posts`                  | user   |                                          |
| DELETE                 | `/api/posts/:id`              | user   | own posts only                           |
| GET                    | `/api/users/:id/posts`        | user   | **Aggregation scenario 2** (`$lookup`)   |
| GET                    | `/api/users/by-interest`      | admin  | **Aggregation scenario 1**, `?interest=` |
| GET                    | `/api/admin/notes`            | admin  | everyone's notes, `?owner=` filter       |
| GET / POST             | `/api/admin/users`            | admin  |                                          |
| GET / PATCH / DELETE   | `/api/admin/users/:id`        | admin  | deleting a user also deletes their content |

Errors always look like `{ "error": { "code": "NOT_FOUND", "message": "…" } }`.

## Indexes

All indexes are declared with `schema.index()` in `src/models/*.model.ts`; in production `autoIndex` is off and `npm run sync-indexes` builds exactly those. There are **four custom indexes**, each backing specific queries:

| Collection | Index                         | Queries it serves                                                                                             |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| users      | `{ email: 1 }` unique         | login lookup; duplicate-email check on create                                                                 |
| users      | `{ interests: 1 }` (multikey) | opening `$match` of the interests aggregation, with or without `?interest=`                                   |
| notes      | `{ owner: 1, _id: -1 }`       | "my notes" list and count (filter + sort, no in-memory sort); admin notes filtered by `?owner=`              |
| posts      | `{ author: 1, _id: -1 }`      | `$lookup` from users to posts for one author, sorted newest first                                            |

The default `_id` index covers everything else: fetching a user/note/post by id, owner-scoped reads and deletes (`{ _id, owner }`), and the admin lists sorted by `_id`.

Indexes deliberately **not** created:

- `notes.owner` / `posts.author` alone — the compound indexes above already serve them through their prefix.
- `users.role` — only used by the "last admin" guard, which counts a handful of admins.
- `createdAt` — lists sort by `_id`, which is already time-ordered.
- Total counts for unfiltered admin lists use `estimatedDocumentCount()` (collection metadata, no scan).

`npm run explain` prints the plan for each query; every one uses an `IXSCAN`.

## Aggregations

**Scenario 1 — users grouped by interest** (`src/services/interests.aggregation.ts`): a single `User.collection.aggregate()` call and no other database methods. `$match` (uses `interests_1`) → `$project` → `$unwind` → `$group` by interest → `$sort` → `$facet` for the page of groups plus the total count.

**Scenario 2 — a user's posts** (`src/services/user-posts.aggregation.ts`): one pipeline on `users`. `$match` on `_id` → `$lookup` into `posts` on `author` (uses `author_1__id_-1`), with an inner `$sort` and `$facet` for pagination → `$project`. A missing user returns 404; a user with no posts returns an empty page.

## Project layout

```
api/index.ts          Vercel serverless entry (lazy app + cached DB connection)
src/app.ts            Express app: security middleware, routes, error handler
src/models/           Mongoose schemas and their indexes
src/routes/           Route handlers, validated with zod
src/services/         The two aggregation pipelines
src/middleware/       authenticate, requireRole, validation, rate limits
scripts/              sync-indexes, seed, seed-demo, explain
tests/                vitest + supertest + mongodb-memory-server
```
