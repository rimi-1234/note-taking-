# Tasks - Frontend foundation

- [x] [config] `frontend/package.json`, `tsconfig.json`, `next.config.mjs`, `.env.example` (`NEXT_PUBLIC_API_URL`)
- [x] [frontend] `src/lib/api.ts`: fetch wrapper with token injection, `credentials: 'include'`, `X-Requested-With`, single-flight refresh on 401
- [x] [frontend] `src/lib/auth-context.tsx`: `user`, `login`, `logout`, session restore via `/auth/refresh`
- [x] [frontend] `src/app/layout.tsx`, `src/components/nav.tsx`, `src/app/globals.css`
- [x] [frontend] `src/components/guards.tsx`: `RequireAuth`, `RequireAdmin`
- [x] [frontend] `src/app/login/page.tsx`
- [x] [test] `npm run typecheck` + `npm run build` succeed
