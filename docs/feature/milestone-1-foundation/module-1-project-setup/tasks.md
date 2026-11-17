# Tasks - Project setup

- [x] [config] Create `package.json` with scripts (`dev`, `build`, `start`, `test`, `typecheck`) and `tsconfig.json` (strict, NodeNext modules)
- [x] [config] Install runtime and dev dependencies
- [x] [config] Add `.gitignore`, `.gitattributes`, `.env.example` and `git init`
- [x] [backend] `src/config/env.ts`: zod schema for every environment variable; crash at startup with a clear message when one is missing
- [x] [backend] `src/lib/logger.ts`: pino logger with password, token and cookie redaction
- [x] [backend] `src/lib/errors.ts`: `AppError` class, `notFound` handler and the central error handler producing `{ error: { code, message, details? } }`
- [x] [backend] `src/app.ts`: `createApp()` wiring helmet, CORS allow-list with credentials, JSON body limit, cookie-parser, pino-http, trust proxy, `/health`
- [x] [backend] `src/db.ts`: connect and disconnect helpers; `autoIndex` only outside production
- [x] [backend] `src/server.ts`: load env, connect, listen, graceful shutdown
- [x] [test] `vitest.config.ts` and `tests/setup.ts` starting mongodb-memory-server
- [x] [test] Tests for `/health`, the 404 format and the error format
