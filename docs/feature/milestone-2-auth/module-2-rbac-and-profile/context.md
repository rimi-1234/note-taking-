# Context - RBAC and profile

**Decisions applied:** 2 (self-profile), 9 (database re-check), 10 (`tokenVersion`), 17.

**Contracts**

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /api/users/me` | Bearer | `200 { user }` |
| `PATCH /api/users/me` | `{ name?, interests?, currentPassword?, newPassword? }` | `200 { user }`; if the password changed, the refresh cookie is cleared and the client must log in again |

**Status codes:** `401 UNAUTHENTICATED` (no or bad token), `403 FORBIDDEN` (wrong role), `400 VALIDATION_ERROR`.

**Index use:** every authenticated request does one `findById` (built-in `_id` index).
