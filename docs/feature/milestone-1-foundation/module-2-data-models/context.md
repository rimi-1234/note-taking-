# Context - Data models

**Decisions applied:** 5 (Note fields), 6 (User and Post fields), 7 (seeds), 10 (`tokenVersion`), 21 (sync-indexes), 23 (index plan).

**Index plan and the query each index serves**

| Collection | Index | Serves |
| --- | --- | --- |
| users | `_id` (automatic) | `GET /users/me`, auth lookup per request, admin user list sorted by `_id`, `GET /admin/users/:id` |
| users | `{ email: 1 }` unique | Login lookup, duplicate-email check |
| users | `{ interests: 1 }` multikey | Opening `$match` of the interests aggregation |
| notes | `_id` (automatic) | `GET /notes/:id`, admin unfiltered notes list |
| notes | `{ owner: 1, _id: -1 }` | My notes list + count, admin `?owner=` filter, cascade delete |
| posts | `{ author: 1, _id: -1 }` | `$lookup` pipeline + count, cascade delete |

**Why no `createdAt` index:** ObjectIds embed their creation time, so sorting by `_id` gives newest-first order using indexes we already need.
