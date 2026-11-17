# Context - Auth core

**Decisions applied:** 9, 10, 11, 17, 18.

**Contracts**

| Endpoint | Request | Success response |
| --- | --- | --- |
| `POST /api/auth/login` | `{ email, password }` | `200 { accessToken, user }` + `Set-Cookie: refreshToken` |
| `POST /api/auth/refresh` | cookie + `X-Requested-With` | `200 { accessToken, user }` + rotated cookie |
| `POST /api/auth/logout` | cookie + `X-Requested-With` | `204` + cleared cookie |

**Token payloads:** access `{ sub, role, tv, type: "access" }` (15 min); refresh `{ sub, tv, type: "refresh" }` (7 days). `tv` is the user's `tokenVersion`.

**Cookie:** name `refreshToken`, `httpOnly`, `path=/api/auth`, `maxAge=7d`; production `Secure; SameSite=None`, otherwise `SameSite=Lax`.

**Errors:** wrong email or password gives `401 INVALID_CREDENTIALS` with the message "Invalid credentials".
