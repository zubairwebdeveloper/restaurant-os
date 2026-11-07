import { describe, it, expect } from "vitest";
import { approveApplication, changeTenantStatus, rejectApplication } from "@/lib/platform/tenant-lifecycle";
import { requirePlatformAdmin } from "@/lib/security/authorization";
import { verifyTenantAccess } from "@/lib/security/tenant-access";
import { PlatformError } from "@/lib/platform/errors";
import { createFakeAuth, createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const APP = "AppAAAAAAAAAAAAAAAAA"; // 20 chars
const application = (extra = {}) => ({
  ownerUid: "owner1", restaurantName: "Green Lagoon Hotel", businessType: "HOTEL", city: "Chashma", country: "Pakistan",
  phone: "+92 300 1234567", status: "PENDING", ...extra,
});
const auth = createFakeAuth({
  owner1: { email: "owner@example.com", emailVerified: true },
  owner2: { email: "unverified@example.com", emailVerified: false },
});
const base = (extra = {}) => createFakeFirestore({ [`tenantApplications/${APP}`]: application(extra) });
const args = { applicationId: APP, adminUid: "root", serverTimestamp: TS };
const tenantIds = (db) => db._all("tenants/").filter((p) => p.split("/").length === 2);

describe("approveApplication", () => {
  it("creates tenant, OWNER membership, audit logs and updates the application in one transaction", async () => {
    const db = base();
    const { tenantId, alreadyApproved } = await approveApplication(db, auth, args);
    expect(alreadyApproved).toBe(false);
    expect(tenantId).toMatch(/^[A-Za-z0-9]{20}$/);

    expect(db._store.get(`tenants/${tenantId}`)).toMatchObject({ status: "ACTIVE", ownerUid: "owner1", profile: { name: "Green Lagoon Hotel" } });
    const member = db._store.get(`tenants/${tenantId}/members/owner1`);
    expect(member).toMatchObject({ uid: "owner1", role: "OWNER", status: "ACTIVE" });
    expect(member.permissions).toContain("SETTINGS_MANAGE");
    expect(db._store.get(`tenantApplications/${APP}`)).toMatchObject({ status: "APPROVED", tenantId, reviewedBy: "root" });
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
    expect(db._all(`tenants/${tenantId}/auditLogs/`)).toHaveLength(1);

    expect(db.stats.commits).toBe(1); // single atomic commit, so no partial state is possible
    expect(db.stats.lastWrites.length).toBeGreaterThanOrEqual(5);
  });

  it("is safe to repeat: same tenantId, nothing duplicated", async () => {
    const db = base();
    const first = await approveApplication(db, auth, args);
    const second = await approveApplication(db, auth, args);
    expect(second).toEqual({ tenantId: first.tenantId, alreadyApproved: true });
    expect(tenantIds(db)).toHaveLength(1);
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
  });

  it("creates exactly one tenant when approved twice concurrently", async () => {
    const db = base();
    const [a, b] = await Promise.all([approveApplication(db, auth, args), approveApplication(db, auth, args)]);
    expect(a.tenantId).toBe(b.tenantId);
    expect(tenantIds(db)).toHaveLength(1);
    expect([a.alreadyApproved, b.alreadyApproved].sort()).toEqual([false, true]);
  });

  it("the new owner can access the new tenant, a stranger cannot", async () => {
    const db = base();
    const { tenantId } = await approveApplication(db, auth, args);
    await expect(verifyTenantAccess(db, { uid: "owner1", tenantId, permission: "SETTINGS_MANAGE" })).resolves.toBeTruthy();
    await expect(verifyTenantAccess(db, { uid: "owner2", tenantId })).rejects.toMatchObject({ status: 403 });
  });

  it("rejects missing applications, unverified owners and unknown owners", async () => {
    await expect(approveApplication(base(), auth, { ...args, applicationId: "Missing00000000000000" })).rejects.toMatchObject({ code: "APPLICATION_NOT_FOUND" });
    const unverified = base({ ownerUid: "owner2" });
    await expect(approveApplication(unverified, auth, args)).rejects.toMatchObject({ code: "OWNER_EMAIL_NOT_VERIFIED" });
    expect(tenantIds(unverified)).toHaveLength(0);
    const unknown = base({ ownerUid: "nobody" });
    await expect(approveApplication(unknown, auth, args)).rejects.toMatchObject({ code: "OWNER_NOT_FOUND" });
    expect(tenantIds(unknown)).toHaveLength(0);
  });

  it("cannot approve a rejected application", async () => {
    const db = base({ status: "REJECTED" });
    await expect(approveApplication(db, auth, args)).rejects.toMatchObject({ code: "APPLICATION_NOT_PENDING", status: 409 });
    expect(tenantIds(db)).toHaveLength(0);
  });
});

describe("rejectApplication", () => {
  it("rejects with a reason, audits it, and is repeatable", async () => {
    const db = base();
    await rejectApplication(db, { ...args, reason: "  Incomplete business details  " });
    expect(db._store.get(`tenantApplications/${APP}`)).toMatchObject({ status: "REJECTED", rejectionReason: "Incomplete business details" });
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
    await expect(rejectApplication(db, { ...args, reason: "again please" })).resolves.toEqual({ alreadyRejected: true });
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
  });

  it("requires a reason and refuses approved applications", async () => {
    await expect(rejectApplication(base(), { ...args, reason: "   " })).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    await expect(rejectApplication(base({ status: "APPROVED", tenantId: "x" }), { ...args, reason: "too late" })).rejects.toMatchObject({ code: "APPLICATION_NOT_PENDING" });
  });
});

describe("changeTenantStatus", () => {
  const T = "TenantAAAAAAAAAAAAAA";
  const seed = (status = "ACTIVE", withPublic = true) =>
    createFakeFirestore({
      [`tenants/${T}`]: { status, ownerUid: "owner1", profile: { name: "X" } },
      [`tenants/${T}/members/owner1`]: { uid: "owner1", role: "OWNER", status: "ACTIVE", permissions: ["POS_READ"] },
      ...(withPublic ? { [`publicProfiles/${T}`]: { status } } : {}),
    });
  const run = (db, action, reason) => changeTenantStatus(db, { tenantId: T, action, adminUid: "root", reason, serverTimestamp: TS });

  it("suspends: records reason, hides the public profile, audits, and revokes server access", async () => {
    const db = seed();
    await expect(verifyTenantAccess(db, { uid: "owner1", tenantId: T })).resolves.toBeTruthy();
    await run(db, "SUSPEND", "Unpaid invoice");
    expect(db._store.get(`tenants/${T}`)).toMatchObject({ status: "SUSPENDED", statusReason: "Unpaid invoice", statusChangedBy: "root" });
    expect(db._store.get(`publicProfiles/${T}`).status).toBe("SUSPENDED");
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
    await expect(verifyTenantAccess(db, { uid: "owner1", tenantId: T })).rejects.toMatchObject({ status: 403 });
  });

  it("reactivates a suspended tenant and restores access", async () => {
    const db = seed("SUSPENDED");
    await run(db, "REACTIVATE");
    expect(db._store.get(`tenants/${T}`).status).toBe("ACTIVE");
    await expect(verifyTenantAccess(db, { uid: "owner1", tenantId: T })).resolves.toBeTruthy();
  });

  it("works when no public profile exists yet", async () => {
    const db = seed("ACTIVE", false);
    await run(db, "SUSPEND", "Policy breach");
    expect(db._store.has(`publicProfiles/${T}`)).toBe(false);
  });

  it("is idempotent and enforces valid transitions", async () => {
    const db = seed("SUSPENDED");
    await expect(run(db, "SUSPEND", "already suspended")).resolves.toMatchObject({ unchanged: true });
    expect(db._all("platformAuditLogs/")).toHaveLength(0);
    for (const status of ["PENDING", "REJECTED", "CANCELLED"]) {
      await expect(run(seed(status), "REACTIVATE")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
      await expect(run(seed(status), "SUSPEND", "reason here")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    }
  });

  it("requires a reason to suspend, rejects unknown actions and tenants", async () => {
    await expect(run(seed(), "SUSPEND", "")).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    await expect(run(seed(), "DELETE", "reason")).rejects.toBeInstanceOf(PlatformError);
    await expect(changeTenantStatus(seed(), { tenantId: "Missing00000000000000", action: "SUSPEND", adminUid: "root", reason: "reason", serverTimestamp: TS })).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });
});

describe("platform authorization for mutations", () => {
  const db = createFakeFirestore({
    "platformUsers/root": { role: "SUPER_ADMIN", status: "ACTIVE" },
    "platformUsers/helper": { role: "PLATFORM_SUPPORT", status: "ACTIVE" },
    "platformUsers/fired": { role: "SUPER_ADMIN", status: "SUSPENDED" },
  });
  it("only an active SUPER_ADMIN passes the mutation gate; support staff can only read", async () => {
    await expect(requirePlatformAdmin(db, "root", ["SUPER_ADMIN"])).resolves.toBeTruthy();
    await expect(requirePlatformAdmin(db, "helper", ["SUPER_ADMIN"])).rejects.toMatchObject({ status: 403 });
    await expect(requirePlatformAdmin(db, "helper")).resolves.toBeTruthy();
    await expect(requirePlatformAdmin(db, "fired", ["SUPER_ADMIN"])).rejects.toMatchObject({ status: 403 });
    await expect(requirePlatformAdmin(db, "random", ["SUPER_ADMIN"])).rejects.toMatchObject({ status: 403 });
  });
});
