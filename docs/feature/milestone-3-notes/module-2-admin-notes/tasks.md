# Tasks - Admin notes

- [ ] [backend] `src/routes/admin-notes.routes.ts` behind `authenticate` + `requireRole('admin')`
- [ ] [backend] Optional `owner` query param validated as ObjectId
- [ ] [backend] Populate owner `name` and `email` for display (one extra `_id` lookup per page)
- [ ] [test] Admin sees all notes, owner filter works, regular user gets 403
