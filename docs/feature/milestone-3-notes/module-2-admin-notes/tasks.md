# Tasks - Admin notes

- [x] [backend] `src/routes/admin-notes.routes.ts` behind `authenticate` + `requireRole('admin')`
- [x] [backend] Optional `owner` query param validated as ObjectId
- [x] [backend] Populate owner `name` and `email` for display (one extra `_id` lookup per page)
- [x] [test] Admin sees all notes, owner filter works, regular user gets 403
