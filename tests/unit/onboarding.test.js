import { describe, it, expect } from "vitest";
import { listOwnApplications, MAX_APPLICATIONS_PER_OWNER, submitApplication } from "@/lib/onboarding/applications";
import { tenantApplicationInputSchema } from "@/schemas/tenant.schema";
import { approveApplication } from "@/lib/platform/tenant-lifecycle";
import { createFakeAuth, createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const input = { restaurantName: "City Cafe", businessType: "CAFE", city: "Lahore", country: "Pakistan", phone: "+92 300 1234567" };
const apps = (db) => db._all("tenantApplications/");

describe("submitApplication", () => {
  it("creates a PENDING application owned by the caller and notifies platform admins via the audit log", async () => {
    const db = createFakeFirestore();
    const { applicationId } = await submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS });
    expect(db._store.get(`tenantApplications/${applicationId}`)).toEqual({ ...input, ownerUid: "u1", status: "PENDING", createdAt: TS });
    const [logPath] = db._all("platformAuditLogs/");
    expect(db._store.get(logPath)).toMatchObject({ action: "APPLICATION_SUBMITTED", actorUid: "u1", targetId: applicationId });
  });

  it("never stores fields the caller should not control", async () => {
    const db = createFakeFirestore();
    const evil = { ...input, status: "APPROVED", ownerUid: "someoneElse", tenantId: "x" };
    const { applicationId } = await submitApplication(db, { ownerUid: "u1", input: evil, serverTimestamp: TS });
    expect(db._store.get(`tenantApplications/${applicationId}`)).toMatchObject({ status: "PENDING", ownerUid: "u1" });
    expect(db._store.get(`tenantApplications/${applicationId}`).tenantId).toBeUndefined();
  });

  it("blocks a second pending application, including concurrent submissions", async () => {
    const db = createFakeFirestore();
    const results = await Promise.allSettled([
      submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS }),
      submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected").reason).toMatchObject({ code: "APPLICATION_ALREADY_PENDING", status: 409 });
    expect(apps(db)).toHaveLength(1);
  });

  it("allows a new application after a rejection, but caps the total per owner", async () => {
    const seed = {};
    for (let i = 0; i < MAX_APPLICATIONS_PER_OWNER - 1; i++) seed[`tenantApplications/old${i}`] = { ownerUid: "u1", status: "REJECTED" };
    const db = createFakeFirestore(seed);
    await expect(submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS })).resolves.toBeTruthy();
    const full = createFakeFirestore(Object.fromEntries(Array.from({ length: MAX_APPLICATIONS_PER_OWNER }, (_, i) => [`tenantApplications/o${i}`, { ownerUid: "u1", status: "REJECTED" }])));
    await expect(submitApplication(full, { ownerUid: "u1", input, serverTimestamp: TS })).rejects.toMatchObject({ code: "TOO_MANY_APPLICATIONS", status: 429 });
  });

  it("does not let one owner's applications affect another", async () => {
    const db = createFakeFirestore();
    await submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS });
    await expect(submitApplication(db, { ownerUid: "u2", input, serverTimestamp: TS })).resolves.toBeTruthy();
  });

  it("rejects a missing owner", async () => {
    await expect(submitApplication(createFakeFirestore(), { ownerUid: "", input, serverTimestamp: TS })).rejects.toMatchObject({ status: 401 });
  });

  it("end to end with Phase 4: an approved application yields an owner who can see the tenant", async () => {
    const db = createFakeFirestore();
    const auth = createFakeAuth({ u1: { email: "o@x.com", emailVerified: true } });
    const { applicationId } = await submitApplication(db, { ownerUid: "u1", input, serverTimestamp: TS });
    const { tenantId } = await approveApplication(db, auth, { applicationId, adminUid: "root", serverTimestamp: TS });
    expect(db._store.get(`tenants/${tenantId}/members/u1`)).toMatchObject({ role: "OWNER", uid: "u1" });
  });
});

describe("listOwnApplications", () => {
  it("returns only the owner's applications, newest first, JSON-safe", async () => {
    const db = createFakeFirestore({
      "tenantApplications/a": { ownerUid: "u1", restaurantName: "Old", status: "REJECTED", rejectionReason: "Incomplete", createdAt: { toDate: () => new Date("2026-01-01T00:00:00Z") } },
      "tenantApplications/b": { ownerUid: "u1", restaurantName: "New", status: "PENDING", createdAt: { toDate: () => new Date("2026-02-01T00:00:00Z") } },
      "tenantApplications/c": { ownerUid: "u2", restaurantName: "Other", status: "PENDING", createdAt: TS },
    });
    const rows = await listOwnApplications(db, "u1");
    expect(rows.map((r) => r.restaurantName)).toEqual(["New", "Old"]);
    expect(rows[1].rejectionReason).toBe("Incomplete");
    expect(() => JSON.stringify(rows)).not.toThrow();
  });
});

describe("application input schema", () => {
  it("strips unknown keys so clients cannot smuggle fields", () => {
    const r = tenantApplicationInputSchema.safeParse({ ...input, status: "APPROVED", ownerUid: "x" });
    expect(r.success).toBe(true);
    expect(r.data.status).toBeUndefined();
    expect(r.data.ownerUid).toBeUndefined();
  });
});
