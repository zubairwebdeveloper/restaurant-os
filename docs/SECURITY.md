# Security

- Secrets live only in environment variables; `.env.example` lists names only. `FIREBASE_ADMIN_*` must never use the `NEXT_PUBLIC_` prefix.
- `lib/firebase/admin.js` imports `server-only`, so bundling it into client code fails the build.
- Firestore and Storage rules default to deny. See `TENANT_ISOLATION.md` for layers and test status.
- Membership, roles, tenant status, orders, transactions and audit logs are server-written only.
- Sessions: httpOnly Firebase session cookie, revocation checked on every request, tenant access re-verified server-side (see `AUTHENTICATION.md`).
- State-changing cookie-authenticated endpoints accept same-origin requests only (CSRF defence). Redirect targets are validated to prevent open redirects.
- Platform admin bootstrap (first `SUPER_ADMIN`) is not implemented yet (Phase 4); until then no one has platform access.
- App Check code exists (`lib/firebase/app-check.js`) but is unverified; do not enforce it in the console until tested.
- Known dependency advisory: `npm audit` reports `@grpc/grpc-js` 1.9.x pinned inside the `firebase` web SDK. The suggested `--force` fix downgrades firebase to 9.x and is not recommended. Re-check after firebase updates.
