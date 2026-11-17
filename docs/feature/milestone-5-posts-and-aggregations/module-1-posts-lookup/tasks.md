# Tasks - Posts and $lookup

- [ ] [backend] `src/routes/posts.routes.ts`: `POST /api/posts`, `DELETE /api/posts/:id` (author only, 404 otherwise)
- [ ] [backend] `src/services/user-posts.aggregation.ts`: single pipeline with `$lookup`
- [ ] [backend] `GET /api/users/:id/posts` returns `{ user, data, page, limit, total, totalPages }`; 404 for an unknown user
- [ ] [test] Posts appear newest first, pagination, unknown user 404, cannot delete another user's post
