# Tasks - Frontend foundation

- [ ] [config] `frontend/package.json`, `tsconfig.json`, `next.config.mjs`, `.env.example` (`NEXT_PUBLIC_API_URL`)
- [ ] [frontend] `src/lib/api.ts`: fetch wrapper with token injection, `credentials: 'include'`, `X-Requested-With`, single-flight refresh on 401
- [ ] [frontend] `src/lib/auth-context.tsx`: `user`, `login`, `logout`, session restore via `/auth/refresh`
- [ ] [frontend] `src/app/layout.tsx`, `src/components/nav.tsx`, `src/app/globals.css`
- [ ] [frontend] `src/components/guards.tsx`: `RequireAuth`, `RequireAdmin`
- [ ] [frontend] `src/app/login/page.tsx`
- [ ] [test] Manual: log in, reload keeps the session, logout, 15-minute expiry refresh path
