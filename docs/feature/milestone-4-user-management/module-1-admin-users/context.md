# Context - Admin users

**Decisions applied:** 1, 6, 10, 12, 16, 17.

| Operation | Query | Index |
| --- | --- | --- |
| List | `find({}).sort({ _id: -1 })` + `estimatedDocumentCount()` | `_id_` |
| Read / update / delete | by `_id` | `_id_` |
| Duplicate email | unique index violation (E11000) mapped to `409 EMAIL_TAKEN` | `email_1` |
| Last-admin check | `countDocuments({ role: 'admin' })` | none: runs only on admin delete or demote, on a tiny collection. Adding a `role` index for it would be an unnecessary index (PDF section 5). |
| Cascade | `deleteMany({ owner })`, `deleteMany({ author })` | `owner_1__id_-1`, `author_1__id_-1` |

**Guard error codes:** `400 CANNOT_MODIFY_SELF`, `409 LAST_ADMIN`.
