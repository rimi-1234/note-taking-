# Context - Frontend foundation

**Decisions applied:** 11, 19, 20.

- All pages are client components (`'use client'`), because the access token lives in memory.
- Concurrent 401s share one refresh request (single-flight) so the rotating refresh cookie is not used twice.
- `NEXT_PUBLIC_API_URL` example: `http://localhost:4000/api`.
