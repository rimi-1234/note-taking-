# Context - Milestone 3 - Notes

**Goal:** Users manage their own notes with pagination; admins can list and read everyone's notes but cannot modify them.

- Decisions 4 (admin list by `_id` + optional owner filter), 5 (Note fields), 12 (pagination), 15 (admins view only, 404 for non-owners).
- Indexes used: `notes { owner: 1, _id: -1 }` and the built-in `_id`.
- Depends on: Milestone 2.
