# Tenant isolation

## Layers
1. **Firestore rules** (`firebase/firestore.rules`): every path is under `tenants/{tenantId}`; access needs an ACTIVE membership in an ACTIVE tenant plus a named permission. Default deny.
2. **Storage rules** (`firebase/storage.rules`): same check, reading the membership document through `firestore.get()`.
3. **Server code** (`lib/security/tenant-access.js`): the Admin SDK bypasses rules, so every privileged route handler or Server Action must call `verifyTenantAccess(db, { uid, tenantId, permission })` first. It validates the id format, loads tenant and membership, and rejects non-ACTIVE tenants, non-ACTIVE members and missing permissions. All failures return the same 403 shape, so callers cannot learn which tenants exist.
4. **Client**: Redux is never a security boundary. `resetTenantScopedState` clears tenant state on switch or logout.

## Rules for developers
- Never read `tenantId` from a request and use it before `verifyTenantAccess` succeeds.
- Never build a document path from unvalidated input.
- Never write membership, role or tenant status from the client.

## Test status
| Check | Where | Status |
|---|---|---|
| Server access checks (cross-tenant, suspended, pending, permissions, id injection) | `tests/unit/tenant-access.test.js` | **passing (run)** |
| Rules reference only known permissions; no open rules | `tests/unit/permissions.test.js` | **passing (run)** |
| Firestore rules scenarios (all required acceptance tests) | `tests/security/firestore.rules.test.js` | **written, NOT yet executed** |
| Public profiles, slug reservations, tighter tenant-update rule | `tests/security/firestore.rules.test.js` | **written, NOT yet executed** |
| Menu collections are server-write-only; published menu snapshot unreadable by clients | `tests/security/firestore.rules.test.js` | **written, NOT yet executed** |
| Tenant document client-write ban; orders and ledger server-only; cross-tenant order reads | `tests/security/firestore.rules.test.js` | **written, NOT yet executed** |
| Storage rules scenarios | `tests/security/storage.rules.test.js` | **written, NOT yet executed** |

**Tenant isolation must not be called complete until `npm run test:rules` passes on a machine with Java and the Firebase emulators.** The build environment used here could not download the emulator, so the rules have never been run against any input.
