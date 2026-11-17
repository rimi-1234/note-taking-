# Progress - Data models

- **Status:** done
- **Last updated:** 2026-11-18 01:30 (UTC+6)
- **Blockers:** none

## Verification

- `npm run typecheck`: clean.
- `npm test`: 13 of 13 passing (7 app + 6 indexes/model).
- Atlas: `npm run sync-indexes`, `npm run seed`, `npm run seed:demo`.
- Atlas index list matches decision 23 exactly:
  - users: `_id_`, `email_1` unique, `interests_1`
  - notes: `_id_`, `owner_1__id_-1`
  - posts: `_id_`, `author_1__id_-1`
- Counts after seed: 4 users, 4 notes, 4 posts.
