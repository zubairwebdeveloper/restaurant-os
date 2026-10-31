import { hasPermission } from "./permissions";

/**
 * Server-side tenant authorization.
 *
 * The Firebase Admin SDK BYPASSES Firestore Security Rules, so every privileged
 * server operation must call verifyTenantAccess() itself. Never trust a tenantId
 * from the client until this succeeds.
 *
 * `db` is an Admin Firestore instance (or any object with db.doc(path).get()).
 * It is injected so this module stays pure and unit-testable.
 */

export class AuthorizationError extends Error {
  constructor(code, status, message) {
    super(message ?? code);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

// Firestore auto-IDs are 20 alphanumeric characters. Anything else (slashes,
// dots, wildcards) is rejected before it can reach a document path.
const TENANT_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export function isValidTenantId(value) {
  return typeof value === "string" && TENANT_ID_PATTERN.test(value);
}

/**
 * Verifies that `uid` is an ACTIVE member of an ACTIVE tenant and holds `permission`.
 * All "no access" outcomes return the same 403 code family so callers cannot
 * probe which tenants exist.
 */
export async function verifyTenantAccess(db, { uid, tenantId, permission }) {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new AuthorizationError("UNAUTHENTICATED", 401);
  }
  if (!isValidTenantId(tenantId)) {
    throw new AuthorizationError("FORBIDDEN", 403);
  }

  const [tenantSnap, memberSnap] = await Promise.all([
    db.doc(`tenants/${tenantId}`).get(),
    db.doc(`tenants/${tenantId}/members/${uid}`).get(),
  ]);

  if (!tenantSnap.exists || !memberSnap.exists) throw new AuthorizationError("FORBIDDEN", 403);

  const tenant = tenantSnap.data();
  const member = memberSnap.data();

  if (tenant.status !== "ACTIVE") throw new AuthorizationError("FORBIDDEN", 403, "TENANT_NOT_ACTIVE");
  if (member.status !== "ACTIVE") throw new AuthorizationError("FORBIDDEN", 403, "MEMBERSHIP_NOT_ACTIVE");

  if (permission !== undefined && !hasPermission(member.permissions, permission)) {
    throw new AuthorizationError("FORBIDDEN", 403, "MISSING_PERMISSION");
  }

  return { tenantId, uid, role: member.role, permissions: member.permissions };
}
