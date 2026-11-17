# Context - Milestone 4 - User management

**Goal:** Admins add, list, read, update and remove users, with guardrails that make it impossible to lock everyone out, and cascade deletes for the removed user's content.

- Decisions 1 (admins create accounts), 6 (User fields), 12 (pagination), 16 (cascade + guards), 17 (validation, 409 on duplicate email).
- Role changes and password resets bump `tokenVersion` (decision 10).
- Depends on: Milestone 3 (the cascade deletes notes).
