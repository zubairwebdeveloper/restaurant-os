import { describe, it, expect } from "vitest";
import { AuthorizationError, isValidTenantId, verifyTenantAccess } from "@/lib/security/tenant-access";
import { requirePlatformAdmin } from "@/lib/security/authorization";
import { permissionsForRole } from "@/config/permissions";

const TENANT_A = "AAAAAAAAAAAAAAAAAAAA";
const TENANT_B = "BBBBBBBBBBBBBBBBBBBB";

/** Minimal stand-in for Admin Firestore: db.doc(path).get() -> { exists, data() } */
function fakeDb(docs) {
  return {
    doc: (path) => ({
      get: async () => ({ exists: path in docs, data: () => docs[path] }),
    }),
  };
}

const member = (role, status = "ACTIVE") => ({ role, status, permissions: permissionsForRole(role) });

const db = fakeDb({
  [`tenants/${TENANT_A}`]: { status: "ACTIVE" },
  [`tenants/${TENANT_B}`]: { status: "ACTIVE" },
  [`tenants/${TENANT_A}/members/ownerA`]: member("OWNER"),
  [`tenants/${TENANT_A}/members/cashierA`]: member("CASHIER"),
  [`tenants/${TENANT_A}/members/chefA`]: member("CHEF"),
  [`tenants/${TENANT_A}/members/suspendedA`]: member("MANAGER", "SUSPENDED"),
  [`tenants/${TENANT_B}/members/ownerB`]: member("OWNER"),
  "platformUsers/root": { role: "SUPER_ADMIN", status: "ACTIVE" },
  "platformUsers/gone": { role: "SUPER_ADMIN", status: "SUSPENDED" },
});

async function expectDenied(promise, status = 403) {
  await expect(promise).rejects.toBeInstanceOf(AuthorizationError);
  await expect(promise).rejects.toMatchObject({ status });
}

describe("verifyTenantAccess", () => {
  it("allows an active member with the permission", async () => {
    const r = await verifyTenantAccess(db, { uid: "ownerA", tenantId: TENANT_A, permission: "FINANCIAL_READ" });
    expect(r).toMatchObject({ uid: "ownerA", tenantId: TENANT_A, role: "OWNER" });
  });

  it("denies cross-tenant access in both directions", async () => {
    await expectDenied(verifyTenantAccess(db, { uid: "ownerA", tenantId: TENANT_B, permission: "ORDERS_READ" }));
    await expectDenied(verifyTenantAccess(db, { uid: "ownerB", tenantId: TENANT_A, permission: "ORDERS_READ" }));
  });

  it("denies unauthenticated callers with 401", async () => {
    await expectDenied(verifyTenantAccess(db, { uid: "", tenantId: TENANT_A }), 401);
    await expectDenied(verifyTenantAccess(db, { uid: undefined, tenantId: TENANT_A }), 401);
  });

  it("rejects malformed tenant ids (path injection)", async () => {
    for (const bad of ["../platformUsers/root", "a/b", "short", "", null, undefined, `${TENANT_A}/members/x`]) {
      await expectDenied(verifyTenantAccess(db, { uid: "ownerA", tenantId: bad }));
    }
  });

  it("rejects suspended memberships and inactive tenants", async () => {
    await expectDenied(verifyTenantAccess(db, { uid: "suspendedA", tenantId: TENANT_A }));
    const pending = fakeDb({
      [`tenants/${TENANT_A}`]: { status: "PENDING" },
      [`tenants/${TENANT_A}/members/ownerA`]: member("OWNER"),
    });
    await expectDenied(verifyTenantAccess(pending, { uid: "ownerA", tenantId: TENANT_A }));
    const suspended = fakeDb({
      [`tenants/${TENANT_A}`]: { status: "SUSPENDED" },
      [`tenants/${TENANT_A}/members/ownerA`]: member("OWNER"),
    });
    await expectDenied(verifyTenantAccess(suspended, { uid: "ownerA", tenantId: TENANT_A }));
  });

  it("enforces granular permissions", async () => {
    await expectDenied(verifyTenantAccess(db, { uid: "cashierA", tenantId: TENANT_A, permission: "SETTINGS_MANAGE" }));
    await expectDenied(verifyTenantAccess(db, { uid: "chefA", tenantId: TENANT_A, permission: "FINANCIAL_READ" }));
    await expect(
      verifyTenantAccess(db, { uid: "cashierA", tenantId: TENANT_A, permission: "POS_CREATE" }),
    ).resolves.toBeTruthy();
  });

  it("rejects unknown permission names instead of treating them as allowed", async () => {
    await expectDenied(verifyTenantAccess(db, { uid: "ownerA", tenantId: TENANT_A, permission: "DROP_EVERYTHING" }));
  });

  it("returns the same error for missing tenant and missing membership (no enumeration)", async () => {
    const missingTenant = await verifyTenantAccess(db, { uid: "ownerA", tenantId: "CCCCCCCCCCCCCCCCCCCC" }).catch((e) => e);
    const notMember = await verifyTenantAccess(db, { uid: "ownerB", tenantId: TENANT_A }).catch((e) => e);
    expect(missingTenant.code).toBe(notMember.code);
    expect(missingTenant.status).toBe(notMember.status);
  });
});

describe("requirePlatformAdmin", () => {
  it("allows an active platform admin only", async () => {
    await expect(requirePlatformAdmin(db, "root")).resolves.toEqual({ uid: "root", role: "SUPER_ADMIN" });
    await expectDenied(requirePlatformAdmin(db, "gone"));
    await expectDenied(requirePlatformAdmin(db, "ownerA"));
    await expectDenied(requirePlatformAdmin(db, ""), 401);
  });
});

describe("isValidTenantId", () => {
  it("accepts only 20 alphanumeric characters", () => {
    expect(isValidTenantId(TENANT_A)).toBe(true);
    expect(isValidTenantId("AAAAAAAAAAAAAAAAAAA-")).toBe(false);
    expect(isValidTenantId(123)).toBe(false);
  });
});
