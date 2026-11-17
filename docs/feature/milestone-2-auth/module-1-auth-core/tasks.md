# Tasks - Auth core

- [ ] [backend] `src/lib/password.ts`: bcrypt hash (cost 12) and compare
- [ ] [backend] `src/lib/tokens.ts`: sign and verify access and refresh JWTs (separate secrets, both carry `tokenVersion`)
- [ ] [backend] `src/lib/cookies.ts`: refresh-cookie options per environment, set and clear helpers
- [ ] [backend] `src/middleware/validate.ts`: zod validation for body, query and params
- [ ] [backend] `src/middleware/csrf.ts`: require the `X-Requested-With` header
- [ ] [backend] `src/middleware/rate-limit.ts`: login limiter (10 / 15 min) and global limiter (300 / 15 min)
- [ ] [backend] `src/routes/auth.routes.ts`: `POST /api/auth/login`, `/refresh`, `/logout`
- [ ] [test] Login success and failure (same message), refresh rotation, refresh after logout fails, CSRF header required, rate limit
