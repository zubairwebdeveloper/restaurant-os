// Requires the Firestore emulator: run with `npm run test:rules` (see docs/TESTING.md).
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from "firebase/firestore";
import { PROJECT_ID, SEED_DOCS, TENANT_A, TENANT_B, TENANT_PENDING } from "../fixtures/tenants";

let env;
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [path, data] of Object.entries(SEED_DOCS)) await setDoc(doc(db, path), data);
  });
});

const product = (tenantId, extra = {}) => ({ tenantId, name: "New item", visibility: "PRIVATE", ...extra });

describe("tenant isolation", () => {
  it("Green Lagoon owner can read Green Lagoon records", async () => {
    await assertSucceeds(getDoc(doc(as("ownerA"), `tenants/${TENANT_A}/products/pPrivate`)));
    await assertSucceeds(getDoc(doc(as("ownerA"), `tenants/${TENANT_A}/transactions/t1`)));
  });

  it("Green Lagoon owner cannot read City Cafe records", async () => {
    await assertFails(getDoc(doc(as("ownerA"), `tenants/${TENANT_B}/products/pB`)));
    await assertFails(getDoc(doc(as("ownerA"), `tenants/${TENANT_B}/transactions/tB`)));
    await assertFails(getDocs(collection(as("ownerA"), `tenants/${TENANT_B}/products`)));
  });

  it("City Cafe owner cannot read Green Lagoon records", async () => {
    await assertFails(getDoc(doc(as("ownerB"), `tenants/${TENANT_A}/products/pPrivate`)));
    await assertFails(getDoc(doc(as("ownerB"), `tenants/${TENANT_A}/orders/o1`)));
    await assertFails(getDoc(doc(as("ownerB"), `tenants/${TENANT_A}`)));
  });

  it("unauthenticated users cannot read tenant data", async () => {
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_A}/products/pPrivate`)));
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_A}/orders/o1`)));
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_A}`)));
  });

  it("signed-in users with no membership cannot read tenant data", async () => {
    await assertFails(getDoc(doc(as("randomUser"), `tenants/${TENANT_A}/products/pPrivate`)));
  });

  it("suspended memberships are rejected", async () => {
    await assertFails(getDoc(doc(as("suspendedA"), `tenants/${TENANT_A}/products/pPrivate`)));
    await assertFails(getDoc(doc(as("suspendedA"), `tenants/${TENANT_A}`)));
    await assertFails(setDoc(doc(as("suspendedA"), `tenants/${TENANT_A}/products/x`), product(TENANT_A)));
  });

  it("a pending tenant's workspace is not accessible", async () => {
    await assertFails(getDoc(doc(as("ownerC"), `tenants/${TENANT_PENDING}/products/pC`)));
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_PENDING}/products/pC`)));
  });

  it("a suspended tenant loses access for all members", async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), `tenants/${TENANT_A}`), { status: "SUSPENDED" }));
    await assertFails(getDoc(doc(as("ownerA"), `tenants/${TENANT_A}/products/pPrivate`)));
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_A}/products/pPublic`)));
  });
});

describe("public menu", () => {
  it("anyone can read PUBLIC products of an ACTIVE tenant, but not PRIVATE ones", async () => {
    await assertSucceeds(getDoc(doc(anon(), `tenants/${TENANT_A}/products/pPublic`)));
    await assertFails(getDoc(doc(anon(), `tenants/${TENANT_A}/products/pPrivate`)));
  });

  it("public listing requires the visibility filter", async () => {
    const col = collection(anon(), `tenants/${TENANT_A}/products`);
    await assertSucceeds(getDocs(query(col, where("visibility", "==", "PUBLIC"))));
    await assertFails(getDocs(col));
  });
});

describe("role permissions", () => {
  it("cashiers cannot change owner-only settings", async () => {
    await assertFails(updateDoc(doc(as("cashierA"), `tenants/${TENANT_A}`), { profile: { name: "Hacked" } }));
  });

  it("owners can edit presentation fields but not status, subscription or owner", async () => {
    const ref = doc(as("ownerA"), `tenants/${TENANT_A}`);
    await assertSucceeds(updateDoc(ref, { profile: { name: "Green Lagoon Hotel" } }));
    await assertFails(updateDoc(ref, { status: "ACTIVE" }));
    await assertFails(updateDoc(ref, { subscription: { plan: "ENTERPRISE" } }));
    await assertFails(updateDoc(ref, { ownerUid: "ownerB" }));
  });

  it("chefs cannot read financial records but can read orders", async () => {
    await assertFails(getDoc(doc(as("chefA"), `tenants/${TENANT_A}/transactions/t1`)));
    await assertSucceeds(getDoc(doc(as("chefA"), `tenants/${TENANT_A}/orders/o1`)));
  });

  it("cashiers cannot read financial records or employees", async () => {
    await assertFails(getDoc(doc(as("cashierA"), `tenants/${TENANT_A}/transactions/t1`)));
    await assertFails(getDocs(collection(as("cashierA"), `tenants/${TENANT_A}/employees`)));
  });

  it("managers can manage the menu", async () => {
    await assertSucceeds(setDoc(doc(as("managerA"), `tenants/${TENANT_A}/products/pNew`), product(TENANT_A)));
  });

  it("cashiers cannot create, edit or delete menu items", async () => {
    await assertFails(setDoc(doc(as("cashierA"), `tenants/${TENANT_A}/products/pNew`), product(TENANT_A)));
    await assertFails(updateDoc(doc(as("cashierA"), `tenants/${TENANT_A}/products/pPublic`), { name: "Free food" }));
    await assertFails(deleteDoc(doc(as("cashierA"), `tenants/${TENANT_A}/products/pPublic`)));
  });
});

describe("roles and memberships", () => {
  it("users cannot modify their own role or permissions", async () => {
    await assertFails(updateDoc(doc(as("cashierA"), `tenants/${TENANT_A}/members/cashierA`), { role: "OWNER" }));
    await assertFails(updateDoc(doc(as("cashierA"), `tenants/${TENANT_A}/members/cashierA`), { permissions: ["FINANCIAL_MANAGE"] }));
    await assertFails(updateDoc(doc(as("ownerA"), `tenants/${TENANT_A}/members/ownerA`), { role: "OWNER" }));
  });

  it("users cannot create memberships, including OWNER memberships for themselves", async () => {
    const owner = { role: "OWNER", status: "ACTIVE", permissions: ["SETTINGS_MANAGE"] };
    await assertFails(setDoc(doc(as("ownerA"), `tenants/${TENANT_B}/members/ownerA`), owner));
    await assertFails(setDoc(doc(as("randomUser"), `tenants/${TENANT_A}/members/randomUser`), owner));
  });

  it("members can read their own membership; others cannot", async () => {
    await assertSucceeds(getDoc(doc(as("cashierA"), `tenants/${TENANT_A}/members/cashierA`)));
    await assertFails(getDoc(doc(as("cashierA"), `tenants/${TENANT_A}/members/ownerA`)));
  });
});

describe("tenant id manipulation", () => {
  it("cannot create documents in another tenant", async () => {
    await assertFails(setDoc(doc(as("ownerA"), `tenants/${TENANT_B}/products/pEvil`), product(TENANT_B)));
  });

  it("cannot write a document whose tenantId field points at another tenant", async () => {
    await assertFails(setDoc(doc(as("ownerA"), `tenants/${TENANT_A}/products/pEvil`), product(TENANT_B)));
  });

  it("cannot move an existing document to another tenant by changing tenantId", async () => {
    await assertFails(updateDoc(doc(as("ownerA"), `tenants/${TENANT_A}/products/pPublic`), { tenantId: TENANT_B }));
  });
});

describe("immutable financial records", () => {
  it("even owners cannot create, update or delete transactions from the client", async () => {
    const ref = doc(as("ownerA"), `tenants/${TENANT_A}/transactions/t1`);
    await assertFails(updateDoc(ref, { amount: 1 }));
    await assertFails(deleteDoc(ref));
    await assertFails(setDoc(doc(as("ownerA"), `tenants/${TENANT_A}/transactions/t2`), { tenantId: TENANT_A, amount: 5 }));
  });

  it("expenses are append-only", async () => {
    const ref = doc(as("ownerA"), `tenants/${TENANT_A}/expenses/e1`);
    await assertSucceeds(setDoc(ref, { tenantId: TENANT_A, amount: 50 }));
    await assertFails(updateDoc(ref, { amount: 1 }));
    await assertFails(deleteDoc(ref));
  });
});

describe("onboarding and platform administration", () => {
  const application = (uid, extra = {}) => ({
    ownerUid: uid, restaurantName: "City Cafe", businessType: "CAFE", city: "Lahore", country: "Pakistan",
    phone: "+92 300 1234567", status: "PENDING", createdAt: serverTimestamp(), ...extra,
  });

  it("an owner can submit a PENDING application for themselves", async () => {
    await assertSucceeds(setDoc(doc(as("newOwner"), "tenantApplications/a1"), application("newOwner")));
  });

  it("an application cannot be created as ACTIVE or on behalf of someone else", async () => {
    await assertFails(setDoc(doc(as("newOwner"), "tenantApplications/a2"), application("newOwner", { status: "ACTIVE" })));
    await assertFails(setDoc(doc(as("newOwner"), "tenantApplications/a3"), application("victim")));
    await assertFails(setDoc(doc(as("newOwner"), "tenantApplications/a4"), application("newOwner", { role: "SUPER_ADMIN" })));
  });

  it("applications cannot be read by other users or edited after submission", async () => {
    await assertFails(getDoc(doc(as("newOwner"), "tenantApplications/appExisting")));
    await assertSucceeds(setDoc(doc(as("newOwner"), "tenantApplications/a1"), application("newOwner")));
    await assertFails(updateDoc(doc(as("newOwner"), "tenantApplications/a1"), { status: "ACTIVE" }));
  });

  it("nobody can make themselves a platform admin", async () => {
    await assertFails(setDoc(doc(as("newOwner"), "platformUsers/newOwner"), { role: "SUPER_ADMIN", status: "ACTIVE" }));
  });

  it("only platform admins can list tenants and read applications", async () => {
    await assertFails(getDocs(collection(as("ownerA"), "tenants")));
    await assertSucceeds(getDocs(collection(as("root"), "tenants")));
    await assertSucceeds(getDoc(doc(as("root"), "tenantApplications/appExisting")));
  });
});
