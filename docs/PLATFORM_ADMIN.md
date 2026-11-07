# Platform administration (Phase 4)

## Roles
- `SUPER_ADMIN`: reads everything below and may approve/reject applications and suspend/reactivate restaurants.
- `PLATFORM_SUPPORT`: read-only. The action buttons are hidden for them, and every mutation re-checks `SUPER_ADMIN` on the server.
Roles live in `platformUsers/{uid}` (`role`, `status`) and are written only by trusted server code.

## Creating the first SUPER_ADMIN (bootstrap)
Public registration can never produce a platform admin. An operator runs a command on a trusted machine:
1. Register the account in the app and verify its email.
2. Put Admin credentials in `.env.local` (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`), or use the emulators (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`).
3. Run `npm run bootstrap:admin -- --email you@example.com`.

The script checks the account exists with a verified email, refuses to create a second SUPER_ADMIN (unless `--allow-additional`), does nothing if the account already is one, and writes a `SUPER_ADMIN_BOOTSTRAPPED` audit entry. Never commit credentials. To revoke access, set the `platformUsers` document `status` to `SUSPENDED` (or delete it) in the console.

## Pages (`/platform/admin/...`)
| Page | Purpose |
|---|---|
| `dashboard` | Totals (restaurants, active, suspended, pending applications) and recent activity |
| `applications` | Search/filter applications; approve or reject (reason required) |
| `tenants` | Search/filter restaurants with owner email; suspend (reason required) or reactivate |
| `audit-logs` | Latest 100 platform actions |

Owners now submit applications from `/dashboard/apply` (Phase 5); each submission appears in Recent activity and raises the pending count.

Not built yet (planned later): platform users management, subscription plans and entitlements (Phase 14), usage analytics, system settings.

## Approval, rejection, suspension
All in `lib/platform/tenant-lifecycle.js`, each inside **one Firestore transaction**:
- **Approve**: creates `tenants/{newId}` (`ACTIVE`, starter trial), the `OWNER` membership (with `uid` and full owner permissions), a tenant audit entry and a platform audit entry, and marks the application `APPROVED` with the `tenantId`. The owner must exist in Firebase Auth with a verified email. Repeating or racing the same approval returns the same `tenantId` and creates nothing twice.
- **Reject**: `PENDING` to `REJECTED` with a recorded reason. Approved applications cannot be rejected.
- **Suspend / Reactivate**: only `ACTIVE` to `SUSPENDED` and back. Records reason, actor and time, updates `publicProfiles/{id}.status` if it exists, writes audit entries. Rules and the server session both require `tenant.status == "ACTIVE"`, so staff lose access on their next request.

## Security notes
- Every page data loader (`lib/platform/data.js`) and every Server Action re-verifies the platform admin. The layout guard alone is not relied on, because layouts do not re-run on client navigation.
- `proxy.js` only redirects visitors with no session cookie; it proves nothing about validity.
- Owner emails are looked up with the Admin SDK on the server and never stored in client-readable documents.

## Limits
- Lists load the latest 200 documents and filter/sort/paginate in the browser. Search is substring matching in memory. Move to server-side queries and cursors before hundreds of restaurants.
- Owner lookups call Firebase Auth in batches of 100.
- The audit log view shows the latest 100 entries only.
- Nothing here has run against real Firebase or the emulators. Transaction logic is unit-tested against an in-memory stand-in, not the real database.
