# Context - Milestone 1 - Foundation

**Goal:** A runnable, tested Express + TypeScript backend with configuration, logging, error handling, the database connection, and the three Mongoose models carrying exactly the indexes from decision 23.

- Stack: Express + TypeScript + zod (decision 8), pino logging (decision 21).
- No templates or generators: every file is written by hand (PDF section 5).
- `autoIndex` is off in production; indexes are built with `npm run sync-indexes` (decision 21).
- Tests use vitest + supertest + mongodb-memory-server (decision 22).
- Depends on: nothing. Every later milestone depends on this one.
