# Tasks - Admin users

- [x] [backend] `src/routes/admin-users.routes.ts` behind `requireRole('admin')`
- [x] [backend] `GET /` paginated, sorted by `_id` descending
- [x] [backend] `POST /` creates a user with any role (409 on duplicate email)
- [x] [backend] `GET /:id`, `PATCH /:id` (name, email, role, interests, password); role or password change bumps `tokenVersion`
- [x] [backend] `DELETE /:id` with guards, then `Note.deleteMany({ owner })` and `Post.deleteMany({ author })`
- [x] [test] CRUD, 409, self-delete and self-demote blocked, last-admin guard, cascade removes notes and posts, demoted user's token stops working
