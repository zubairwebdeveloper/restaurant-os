# Authentication and role-based access (Phase 3)

## Flow
1. **Register / sign in** (client): Firebase Authentication email + password (`services/auth.service.js`).
2. **Session exchange**: the client posts a fresh ID token to `POST /api/auth/session`. The server verifies it (including revocation), requires a sign-in within the last 5 minutes, then issues an **httpOnly Firebase session cookie** (`ros_session`, 5 days, `SameSite=Lax`, `Secure` in production).
3. **Every request**: `lib/auth/dal.js` verifies the session cookie (revocation checked), loads the user's platform role and ACTIVE memberships from Firestore, and builds the session. Nothing is cached across requests, so suspension, role changes and revoked sessions apply on the next request.
4. **Route protection**: `proxy.js` is an optimistic redirect for signed-out visitors only (cookie present?). Real verification is the DAL, called from `app/dashboard/layout.jsx` (via `AuthenticatedShell`) and `app/platform/layout.jsx`.
5. **Email verification**: the dashboard requires a verified email. `/verify-email` lets the user resend the link and re-issue the session after verifying.
6. **Active workspace**: `POST /api/tenants/active` stores `ros_tenant` only after `verifyTenantAccess` confirms an ACTIVE membership. A forged or stale cookie is ignored; the first verified membership is used instead.

## Pages
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/dashboard/forbidden`. Invitation acceptance is deferred to Phase 5 (it needs server-side membership creation).

## Server helpers (`lib/auth/dal.js`)
- `getSession()` returns `{ user, platformRole, memberships, activeTenantId }` or `null`.
- `requireSession()` redirects to `/login` or `/verify-email`.
- `requireTenantPermission(permission)` re-checks the active tenant with `verifyTenantAccess`. **Call it in every server component, route handler or action that touches tenant data.**
- `requirePlatformAdminSession()` guards platform admin pages.

## Redux
`authSlice` and `tenantSlice` hold a display-only copy for the UI. `Can` and `usePermission` hide controls the member cannot use; they are not security.
`resetTenantScopedState` (tenant switch) keeps theme, sidebar and the signed-in user. `resetAllSessionState` (logout) keeps only theme and sidebar.

## Data requirements
- Every membership document must contain `uid` (the server sets it when creating a membership). The membership lookup uses a collection-group query on `members.uid`; the index override is in `firebase/firestore.indexes.json` and must be deployed.
- For local development with the emulators set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (server) and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` (browser).
- Enable the Email/Password provider in the Firebase console, and add your domain to Authorized domains.

## Known limitations
- Not yet run against a real Firebase project or the Auth emulator (the build environment had no Firebase access). Sign-in, registration, verification and reset flows are untested end-to-end.
- No application-level rate limiting; Firebase Auth throttles sign-in attempts. Add rate limiting before launch.
- No multi-factor authentication, social sign-in or "sign out on all devices" yet.
- Session claims such as `email_verified` reflect the moment the cookie was issued; verification therefore re-issues the session.
- A request carrying a forged cookie receives a `200` shell that redirects to `/login` during streaming; no protected data is rendered.
