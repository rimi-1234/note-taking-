# Tasks - Admin users

- [ ] [backend] `src/routes/admin-users.routes.ts` behind `requireRole('admin')`
- [ ] [backend] `GET /` paginated, sorted by `_id` descending
- [ ] [backend] `POST /` creates a user with any role (409 on duplicate email)
- [ ] [backend] `GET /:id`, `PATCH /:id` (name, email, role, interests, password); role or password change bumps `tokenVersion`
- [ ] [backend] `DELETE /:id` with guards, then `Note.deleteMany({ owner })` and `Post.deleteMany({ author })`
- [ ] [test] CRUD, 409, self-delete and self-demote blocked, last-admin guard, cascade removes notes and posts, demoted user's token stops working
