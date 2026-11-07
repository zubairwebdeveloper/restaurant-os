import { describe, it, expect } from "vitest";
import { bootstrapSuperAdmin } from "@/lib/platform/bootstrap.mjs";
import { createFakeAuth, createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const auth = createFakeAuth({
  root: { email: "root@example.com", emailVerified: true },
  second: { email: "second@example.com", emailVerified: true },
  unverified: { email: "unverified@example.com", emailVerified: false },
});

describe("bootstrapSuperAdmin", () => {
  it("creates the first SUPER_ADMIN and writes an audit log", async () => {
    const db = createFakeFirestore();
    const r = await bootstrapSuperAdmin(db, auth, { email: "Root@Example.com", serverTimestamp: TS });
    expect(r).toEqual({ created: true, uid: "root" });
    expect(db._store.get("platformUsers/root")).toMatchObject({ role: "SUPER_ADMIN", status: "ACTIVE", createdBy: "bootstrap" });
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
  });

  it("is idempotent for the same account", async () => {
    const db = createFakeFirestore();
    await bootstrapSuperAdmin(db, auth, { email: "root@example.com", serverTimestamp: TS });
    const again = await bootstrapSuperAdmin(db, auth, { email: "root@example.com", serverTimestamp: TS });
    expect(again.created).toBe(false);
    expect(db._all("platformAuditLogs/")).toHaveLength(1);
  });

  it("refuses a second SUPER_ADMIN unless explicitly allowed", async () => {
    const db = createFakeFirestore();
    await bootstrapSuperAdmin(db, auth, { email: "root@example.com", serverTimestamp: TS });
    await expect(bootstrapSuperAdmin(db, auth, { email: "second@example.com", serverTimestamp: TS })).rejects.toThrow(/already exists/);
    expect(db._store.has("platformUsers/second")).toBe(false);
    await expect(
      bootstrapSuperAdmin(db, auth, { email: "second@example.com", serverTimestamp: TS, allowAdditional: true }),
    ).resolves.toMatchObject({ created: true });
  });

  it("rejects unverified, unknown and malformed emails without writing anything", async () => {
    const db = createFakeFirestore();
    await expect(bootstrapSuperAdmin(db, auth, { email: "unverified@example.com", serverTimestamp: TS })).rejects.toThrow(/not verified/);
    await expect(bootstrapSuperAdmin(db, auth, { email: "ghost@example.com", serverTimestamp: TS })).rejects.toThrow(/No Firebase Auth account/);
    await expect(bootstrapSuperAdmin(db, auth, { email: "nope", serverTimestamp: TS })).rejects.toThrow(/valid --email/);
    expect(db._all("platformUsers/")).toHaveLength(0);
  });

  it("does not disguise credential or network failures as a missing account", async () => {
    const broken = { getUserByEmail: async () => { throw Object.assign(new Error("Could not load the default credentials"), { code: "app/invalid-credential" }); } };
    await expect(bootstrapSuperAdmin(createFakeFirestore(), broken, { email: "root@example.com", serverTimestamp: TS })).rejects.toThrow(/default credentials/);
  });

  it("ignores a SUSPENDED SUPER_ADMIN when deciding whether one exists", async () => {
    const db = createFakeFirestore({ "platformUsers/old": { role: "SUPER_ADMIN", status: "SUSPENDED" } });
    await expect(bootstrapSuperAdmin(db, auth, { email: "root@example.com", serverTimestamp: TS })).resolves.toMatchObject({ created: true });
  });
});
