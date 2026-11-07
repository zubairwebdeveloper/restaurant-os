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
- Platform admin: first SUPER_ADMIN is created only by an operator-run script (`docs/PLATFORM_ADMIN.md`). Platform mutations require an active SUPER_ADMIN, are transactional, validated and audit-logged. Support staff are read-only.
- Website CMS: writes go through validated Server Actions using the session's verified tenant; client writes to `branding`/`website`/`profile` are blocked by rules. Public data is a separate, minimal copy. Public pages escape all text and link only https URLs. Slugs are validated before reaching document paths.
- No file uploads exist yet, so no upload attack surface (Phase 6+ and the Storage decision).
- Menu: client writes to categories, products and menus are blocked by rules; all changes are validated, tenant-scoped transactions with audit entries. Prices are integers. The public menu is a separate minimal snapshot read only by server code.
- POS: prices, tax and totals are computed only on the server from the tenant's own menu; the client sends ids and quantities. Orders, payments and refunds are idempotent (UUID keys), run in single transactions, and the payment ledger is append-only and not writable by clients. Refunds need their own permission; discounts need `POS_DISCOUNT`. Card and wallet are demo modes; there is no real payment integration.
- The tenant document (settings, tax, branding, status, counters) can no longer be written from the client.
