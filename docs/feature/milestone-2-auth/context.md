# Context - Milestone 2 - Auth

**Goal:** Secure login with bcrypt-hashed passwords, a 15-minute access token, a rotating 7-day refresh cookie, revocation through `tokenVersion`, rate limiting, role checks, and the user's own profile endpoints.

- Decisions 9, 10, 11 (tokens and cookies), 17 (validation and password policy), 18 (rate limits), 2 (self-profile).
- The refresh cookie must work cross-site in production (Vercel frontend to Render backend), hence `SameSite=None; Secure`.
- Depends on: Milestone 1.
