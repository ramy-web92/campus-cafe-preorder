# F-01 Authentication and session · F-02 Role and ownership access control

**Requirements:** FR-01, FR-02, FR-03, BR-17, NFR-01, NFR-02, NFR-03, NFR-04, NFR-06 · **Issue:** #5 · **Depends on:** F-16 · **Version:** 1.1

## Feature SDS
- **Login:** the user submits e-mail and password. The server looks up the user by lower-cased e-mail, rejects inactive users, and compares the password with the bcrypt hash. On success it regenerates the session, stores `userId` and `role`, and returns the safe profile.
- **Current user:** reloads the user from the database on each call; if the user was deactivated, the session is destroyed and 401 is returned.
- **Logout:** destroys the server session and clears the cookie.
- **Access control (F-02, cross-cutting):** `requireAuth` → 401 when there is no valid session; `requireRole(...roles)` → 403 when the role is not allowed. Ownership filters are applied inside services (see F-05). An error handler turns all errors into the standard error body and never returns stack traces.
- **Failure/boundary cases:** missing e-mail or password → 400; unknown e-mail, wrong password and inactive account → identical 401 (no account enumeration); expired session → 401.

## API specification
| Method / path | Auth | Request | Success | Errors |
|---|---|---|---|---|
| `POST /api/auth/login` | public | `{ "email": "alice@cafe.test", "password": "…" }` | `200 { "id": 1, "name": "Alice", "email": "alice@cafe.test", "role": "CUSTOMER" }` + `Set-Cookie: sid=…; HttpOnly; SameSite=Lax` | `400 BAD_REQUEST`, `401 INVALID_CREDENTIALS` "Invalid email or password." |
| `POST /api/auth/logout` | session | — | `204` (cookie cleared) | `401 UNAUTHENTICATED` |
| `GET /api/auth/me` | session | — | `200 { id, name, email, role }` | `401 UNAUTHENTICATED` |

The response **never** contains `passwordHash`. Error body: `{ "error": { "code", "message", "details?" } }`.

## UI specification
- **Login page:** e-mail and password fields with labels; "Sign in" button disabled while submitting; generic error message on 401; on success, Customers go to the Menu, Operators to the Order queue.
- **Header (all authenticated pages):** product name, user name and role, Logout button. A 401 from any API call returns the user to the Login page.

## Data specification
Uses `User` and `session` from F-16; no new migration.

## Acceptance criteria
| ID | Criterion |
|---|---|
| AC-01 | Given a seeded active user, when they log in with the correct password, then 200 is returned with id, name, e-mail and role, and an httpOnly session cookie is set. |
| AC-02 | Given a wrong password, an unknown e-mail or an inactive account, when logging in, then 401 `INVALID_CREDENTIALS` with the same message is returned and no session is created. |
| AC-03 | Given a logged-in user, when they log out, then 204 is returned and a later request with the old cookie returns 401. |
| AC-04 | Given a logged-in user, `GET /api/auth/me` returns their profile; without a session it returns 401. |
| AC-05 | Given no session, every protected endpoint (menu, orders, operator) returns 401 and the body contains no order or user data. |
| AC-06 | Seeded passwords are stored as bcrypt hashes (cost ≥ 10) and no API response contains a password or hash. |
| AC-07 | Error responses use the standard error body; an unexpected server error returns 500 with a generic message and no stack trace. |

## Version history
| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | Initial contract |
| 1.1 | 2026-11-07 | Corrected the Issue number (the baseline PR took #1, so issues are #2–#9). No behavior change. |
