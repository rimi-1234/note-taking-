# Tasks - Data models

- [ ] [backend] `src/models/user.model.ts`: fields, lowercase email and interests, `passwordHash` hidden by default, `tokenVersion`, safe `toJSON`
- [ ] [backend] User indexes: `{ email: 1 }` unique and `{ interests: 1 }`
- [ ] [backend] `src/models/note.model.ts` with index `{ owner: 1, _id: -1 }`
- [ ] [backend] `src/models/post.model.ts` with index `{ author: 1, _id: -1 }`
- [ ] [config] `scripts/sync-indexes.ts` calling `syncIndexes()` on every model
- [ ] [config] `scripts/seed.ts`: creates or updates the admin from `ADMIN_*` variables (safe to rerun)
- [ ] [config] `scripts/seed-demo.ts`: demo users with overlapping interests, plus notes and posts
- [ ] [test] Test that each collection has exactly the expected indexes and nothing else
