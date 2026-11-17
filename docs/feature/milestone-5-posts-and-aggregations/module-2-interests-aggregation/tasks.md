# Tasks - Interests aggregation

- [x] [backend] `src/services/interests.aggregation.ts`: single `aggregate()` call, no other Mongo methods
- [x] [backend] Optional `?interest=` filter (same index, equality bound)
- [x] [backend] Route behind `requireRole('admin')`
- [x] [test] Groups are correct, users with no interests are excluded, pagination of groups, user role gets 403
