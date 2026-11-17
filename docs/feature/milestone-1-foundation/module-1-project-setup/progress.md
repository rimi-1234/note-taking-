# Progress - Project setup

- **Status:** done
- **Last updated:** 2026-11-18 01:05 (UTC+6)
- **Blockers:** none

## Verification

- `npm run typecheck`: clean.
- `npm test`: 7 of 7 passing (`tests/app.test.ts`).
- Manual curl against `npm run dev` on a local `mongod`: health 200, unknown route 404, malformed JSON 400, disallowed origin 403, allowed preflight 204. See the QA guide for the commands and output.
- `npm run build` followed by `node dist/src/server.js` serves `/health`.
- With no `.env`, startup fails and lists each missing variable.
