# Tasks - Interests aggregation

- [ ] [backend] `src/services/interests.aggregation.ts`: single `aggregate()` call, no other Mongo methods
- [ ] [backend] Optional `?interest=` filter (same index, equality bound)
- [ ] [backend] Route behind `requireRole('admin')`
- [ ] [test] Groups are correct, users with no interests are excluded, pagination of groups, user role gets 403
