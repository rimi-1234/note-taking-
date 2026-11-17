# Context - Admin notes

**Decisions applied:** 4, 12, 14 (admin-only views), 23.

| Case | Query | Index |
| --- | --- | --- |
| No filter | `find({}).sort({ _id: -1 })` | `_id_` |
| `?owner=` | `find({ owner }).sort({ _id: -1 })` | `owner_1__id_-1` |
| Count, no filter | `estimatedDocumentCount()` (collection metadata) | none needed |
| Count, filtered | `countDocuments({ owner })` | `owner_1__id_-1` |
| Owner details | populate `owner` (`$in` on `_id`) | `_id_` |
