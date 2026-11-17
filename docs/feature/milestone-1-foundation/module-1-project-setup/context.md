# Context - Project setup

**Decisions applied:** 8 (Express + TS + zod), 17 (error format), 18 (helmet, trust proxy), 21 (pino, env validation, `/health`, autoIndex off in production), 22 (vitest + memory server).

**Environment variables**

| Name | Example | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | Render sets this automatically |
| `MONGODB_URI` | `mongodb+srv://...` | Required |
| `JWT_ACCESS_SECRET` | 32+ random chars | Required |
| `JWT_REFRESH_SECRET` | 32+ random chars | Required, different from the access secret |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allow-list |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | | Only used by `npm run seed` |

**Error contract**

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }
```

**Assumptions:** Node 20+ (local machine has Node 24).
