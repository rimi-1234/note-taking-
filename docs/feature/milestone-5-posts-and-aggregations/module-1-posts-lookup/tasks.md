# Tasks - Posts and $lookup

- [x] [backend] `src/routes/posts.routes.ts`: `POST /api/posts`, `DELETE /api/posts/:id` (author only, 404 otherwise)
- [x] [backend] `src/services/user-posts.aggregation.ts`: single pipeline with `$lookup`
- [x] [backend] `GET /api/users/:id/posts` returns `{ user, data, page, limit, total, totalPages }`; 404 for an unknown user
- [x] [test] Posts appear newest first, pagination, unknown user 404, cannot delete another user's post
