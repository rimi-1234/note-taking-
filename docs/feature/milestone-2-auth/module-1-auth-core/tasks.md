# Tasks - Auth core

- [x] [backend] `src/lib/password.ts`: bcrypt hash (cost 12) and compare
- [x] [backend] `src/lib/tokens.ts`: sign and verify access and refresh JWTs (separate secrets, both carry `tokenVersion`)
- [x] [backend] `src/lib/cookies.ts`: refresh-cookie options per environment, set and clear helpers
- [x] [backend] `src/middleware/validate.ts`: zod validation for body, query and params
- [x] [backend] `src/middleware/csrf.ts`: require the `X-Requested-With` header
- [x] [backend] `src/middleware/rate-limit.ts`: login limiter (10 / 15 min) and global limiter (300 / 15 min)
- [x] [backend] `src/routes/auth.routes.ts`: `POST /api/auth/login`, `/refresh`, `/logout`
- [x] [test] Login success and failure (same message), refresh rotation, refresh after logout fails, CSRF header required, rate limit
