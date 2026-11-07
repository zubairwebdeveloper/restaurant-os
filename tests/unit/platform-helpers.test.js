import { describe, it, expect } from "vitest";
import { filterApplications, filterTenants } from "@/lib/platform/filters";
import { getPlatformOverview, joinTenantRows, listApplications, listAuditLogs, listTenants, loadOwners } from "@/lib/platform/queries";
import { paginate, sortRows } from "@/lib/utils/table";
import { formatDateTime } from "@/lib/utils/format";
import { approveApplicationSchema, reactivateTenantSchema, rejectApplicationSchema, suspendTenantSchema } from "@/schemas/platform.schema";
import { createFakeAuth, createFakeFirestore } from "../fixtures/fake-firestore";

const ts = (iso) => ({ toDate: () => new Date(iso) });

describe("filters", () => {
  const tenants = [
    { name: "Green Lagoon Hotel", status: "ACTIVE", ownerEmail: "a@x.com", city: "Chashma" },
    { name: "City Cafe", status: "SUSPENDED", ownerEmail: "b@x.com", city: "Lahore" },
    { name: "Spice Garden", status: "ACTIVE", ownerEmail: null, city: null },
  ];
  it("filters by status and by name, owner email or city (case-insensitive)", () => {
    expect(filterTenants(tenants, { status: "ACTIVE" })).toHaveLength(2);
    expect(filterTenants(tenants, { search: "LAGOON" })).toHaveLength(1);
    expect(filterTenants(tenants, { search: "b@x" })[0].name).toBe("City Cafe");
    expect(filterTenants(tenants, { search: "lahore", status: "ACTIVE" })).toHaveLength(0);
    expect(filterTenants(tenants, { search: "  " })).toHaveLength(3);
  });
  it("filters applications the same way", () => {
    const apps = [{ restaurantName: "Fast Bite", status: "PENDING", city: "Isb" }, { restaurantName: "Old", status: "REJECTED" }];
    expect(filterApplications(apps, { status: "PENDING" })).toHaveLength(1);
    expect(filterApplications(apps, { search: "fast" })).toHaveLength(1);
  });
});

describe("table helpers", () => {
  const rows = [{ n: "b", v: 2 }, { n: "a", v: 10 }, { n: "c", v: null }, { n: "d", v: 2 }];
  it("sorts stably, numerically, and puts empty values last in both directions", () => {
    expect(sortRows(rows, (r) => r.v).map((r) => r.n)).toEqual(["b", "d", "a", "c"]);
    expect(sortRows(rows, (r) => r.v, "desc").map((r) => r.n)).toEqual(["a", "b", "d", "c"]);
    expect(sortRows(rows, (r) => r.n).map((r) => r.n)).toEqual(["a", "b", "c", "d"]);
    expect(sortRows(rows, undefined)).toBe(rows);
  });
  it("paginates and clamps out-of-range pages", () => {
    const list = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(list, 1, 10)).toMatchObject({ page: 1, pageCount: 3, total: 25 });
    expect(paginate(list, 3, 10).rows).toHaveLength(5);
    expect(paginate(list, 99, 10).page).toBe(3);
    expect(paginate(list, -4, 10).page).toBe(1);
    expect(paginate([], 1, 10)).toMatchObject({ pageCount: 1, rows: [] });
  });
  it("formats dates in fixed UTC", () => {
    expect(formatDateTime("2026-03-05T14:30:00Z")).toMatch(/2026.*14:30 UTC/);
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("garbage")).toBe("-");
  });
});

describe("queries", () => {
  const db = createFakeFirestore({
    "tenants/t1": { status: "ACTIVE", ownerUid: "u1", profile: { name: "Green Lagoon", city: "Chashma" }, subscription: { planId: "starter" }, createdAt: ts("2026-01-02T00:00:00Z") },
    "tenants/t2": { status: "SUSPENDED", ownerUid: "u2", profile: { name: "City Cafe" }, createdAt: ts("2026-02-01T00:00:00Z") },
    "tenants/t3": { status: "ACTIVE", ownerUid: "ghost", profile: {}, createdAt: "2026-03-01" },
    "tenantApplications/a1": { status: "PENDING", ownerUid: "u1", restaurantName: "Fast Bite", createdAt: "2026-03-02" },
    "tenantApplications/a2": { status: "REJECTED", ownerUid: "u2", restaurantName: "Old", createdAt: "2026-01-01" },
    "platformAuditLogs/l1": { action: "TENANT_SUSPENDED", createdAt: ts("2026-03-03T00:00:00Z") },
  });
  const auth = createFakeAuth({ u1: { email: "one@x.com", displayName: "One" }, u2: { email: "two@x.com" } });

  it("computes overview counts", async () => {
    const o = await getPlatformOverview(db);
    expect(o.totals).toEqual({ total: 3, active: 2, suspended: 1, pendingApplications: 1 });
    expect(o.recentActivity[0]).toMatchObject({ id: "l1", action: "TENANT_SUSPENDED", createdAt: "2026-03-03T00:00:00.000Z" });
  });

  it("joins owners, tolerates missing accounts, and returns JSON-safe rows", async () => {
    const rows = await listTenants(db, auth);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.t1).toMatchObject({ name: "Green Lagoon", ownerEmail: "one@x.com", ownerName: "One", planId: "starter" });
    expect(byId.t3).toMatchObject({ name: "Unnamed restaurant", ownerEmail: null });
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it("lists applications and audit logs", async () => {
    const apps = await listApplications(db, auth);
    expect(apps.find((a) => a.id === "a1")).toMatchObject({ restaurantName: "Fast Bite", ownerEmail: "one@x.com" });
    expect((await listAuditLogs(db))).toHaveLength(1);
  });

  it("looks up owners in batches of 100", async () => {
    const calls = [];
    const batchAuth = { getUsers: async (ids) => (calls.push(ids.length), { users: ids.map(({ uid }) => ({ uid, email: `${uid}@x.com` })) }) };
    const uids = Array.from({ length: 250 }, (_, i) => `u${i}`);
    const owners = await loadOwners(batchAuth, [...uids, ...uids, null]);
    expect(calls).toEqual([100, 100, 50]);
    expect(owners.size).toBe(250);
    expect(joinTenantRows([], owners)).toEqual([]);
  });
});

describe("platform action schemas", () => {
  const id = "AAAAAAAAAAAAAAAAAAAA";
  it("validates ids and requires reasons for reject and suspend", () => {
    expect(approveApplicationSchema.safeParse({ applicationId: id }).success).toBe(true);
    expect(approveApplicationSchema.safeParse({ applicationId: "../x" }).success).toBe(false);
    expect(rejectApplicationSchema.safeParse({ applicationId: id, reason: "no" }).success).toBe(false);
    expect(rejectApplicationSchema.safeParse({ applicationId: id, reason: "Incomplete details" }).success).toBe(true);
    expect(suspendTenantSchema.safeParse({ tenantId: id, reason: "" }).success).toBe(false);
    expect(reactivateTenantSchema.safeParse({ tenantId: id }).success).toBe(true);
    expect(suspendTenantSchema.safeParse({ tenantId: id, reason: "x".repeat(501) }).success).toBe(false);
  });
});
