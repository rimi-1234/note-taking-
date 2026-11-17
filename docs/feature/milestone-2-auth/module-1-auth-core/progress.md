# Progress - Auth core

- **Status:** done
- **Last updated:** 2026-11-18 01:50 (UTC+6)
- **Blockers:** none

## Verification

- `npm run typecheck`: clean.
- `npm test`: 20 of 20 passing (7 app + 6 indexes + 7 auth).
- Manual against local + Atlas-seeded admin: login 200 → refresh 200 → logout 204 → refresh 401.
