# Tasks - RBAC and profile

- [x] [backend] `src/middleware/authenticate.ts`: Bearer token, verify, `findById`, compare `tokenVersion`, attach `req.user`
- [x] [backend] `src/middleware/require-role.ts`
- [x] [backend] `src/lib/object-id.ts`: zod ObjectId schema (invalid ids give 400)
- [x] [backend] `src/routes/me.routes.ts`: `GET /api/users/me`, `PATCH /api/users/me` (name, interests, password with `currentPassword`)
- [x] [backend] Password change bumps `tokenVersion` and clears the refresh cookie
- [x] [test] Missing or expired token 401, deleted user 401, role guard 403, profile read and update, password change logs out other sessions
