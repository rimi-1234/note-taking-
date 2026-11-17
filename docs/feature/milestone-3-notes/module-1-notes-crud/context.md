# Context - Notes CRUD

**Decisions applied:** 5, 12, 15.

**Queries and indexes**

| Operation | Query | Index |
| --- | --- | --- |
| List mine | `find({ owner }).sort({ _id: -1 }).skip().limit()` | `owner_1__id_-1` |
| Count mine | `countDocuments({ owner })` | `owner_1__id_-1` |
| Read one | `findOne({ _id, owner })` (admin: `findById`) | `_id_` |
| Update / delete | `findOneAndUpdate/Delete({ _id, owner })` | `_id_` |

**Pagination response:** `{ data: [...], page, limit, total, totalPages }`.
