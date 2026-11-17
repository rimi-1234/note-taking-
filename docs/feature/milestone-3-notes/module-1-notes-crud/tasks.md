# Tasks - Notes CRUD

- [x] [backend] `src/lib/pagination.ts`: zod query schema (`page` >= 1, `limit` 1-100, default 20) and response builder
- [x] [backend] `src/routes/notes.routes.ts`: `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- [x] [backend] `GET /:id`: owner match for users, any note for admins
- [x] [backend] `PATCH` and `DELETE`: always `{ _id, owner: req.user.id }`
- [x] [test] CRUD happy path, pagination metadata, another user's note gives 404, admin cannot edit others' notes, validation errors
