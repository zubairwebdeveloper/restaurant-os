# API

All endpoints reject cross-site requests: a same-origin `Origin` header (or `Sec-Fetch-Site: same-origin`) is required.

## `POST /api/auth/session`
Body `{ "idToken": string }`. Verifies the ID token (revocation checked, sign-in within 5 minutes) and sets the `ros_session` httpOnly cookie.
Responses: `200 {ok:true}`, `400 INVALID_REQUEST | INVALID_TOKEN`, `401 INVALID_TOKEN | RECENT_SIGNIN_REQUIRED`, `403 FORBIDDEN`.

## `DELETE /api/auth/session`
Clears `ros_session` and `ros_tenant`. Responses: `200`, `403 FORBIDDEN`.

## `POST /api/tenants/active`
Body `{ "tenantId": string }`. Requires a valid session. Sets `ros_tenant` only if the user has an ACTIVE membership in an ACTIVE tenant.
Responses: `200`, `401 UNAUTHENTICATED`, `403 FORBIDDEN` (identical for unknown tenants and non-members, so tenants cannot be enumerated).
