// Requires the Firestore + Storage emulators: run with `npm run test:rules` (see docs/TESTING.md).
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { PROJECT_ID, SEED_DOCS, TENANT_A, TENANT_B } from "../fixtures/tenants";

let env;
const storageAs = (uid) => env.authenticatedContext(uid).storage();
const anonStorage = () => env.unauthenticatedContext().storage();
const bytes = (n = 16) => new Uint8Array(n).fill(1);
const png = { contentType: "image/png" };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
    storage: { rules: readFileSync("firebase/storage.rules", "utf8") },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [path, data] of Object.entries(SEED_DOCS)) await setDoc(doc(db, path), data);
    const storage = ctx.storage();
    await uploadBytes(ref(storage, `tenants/${TENANT_A}/documents/contract.pdf`), bytes(), { contentType: "application/pdf" });
    await uploadBytes(ref(storage, `tenants/${TENANT_A}/invoices/inv1.pdf`), bytes(), { contentType: "application/pdf" });
    await uploadBytes(ref(storage, `tenants/${TENANT_B}/documents/secret.pdf`), bytes(), { contentType: "application/pdf" });
    await uploadBytes(ref(storage, `tenants/${TENANT_A}/products/dish.png`), bytes(), png);
  });
});

describe("storage tenant isolation", () => {
  it("owners can upload to their own tenant, not to another tenant", async () => {
    await assertSucceeds(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/branding/logo.png`), bytes(), png));
    await assertFails(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_B}/branding/logo.png`), bytes(), png));
  });

  it("cross-tenant private reads are denied", async () => {
    await assertSucceeds(getBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/documents/contract.pdf`)));
    await assertFails(getBytes(ref(storageAs("ownerA"), `tenants/${TENANT_B}/documents/secret.pdf`)));
    await assertFails(getBytes(ref(storageAs("ownerB"), `tenants/${TENANT_A}/documents/contract.pdf`)));
  });

  it("unauthenticated users cannot read private files or write anything", async () => {
    await assertFails(getBytes(ref(anonStorage(), `tenants/${TENANT_A}/documents/contract.pdf`)));
    await assertFails(uploadBytes(ref(anonStorage(), `tenants/${TENANT_A}/branding/x.png`), bytes(), png));
  });

  it("suspended members cannot read or write", async () => {
    await assertFails(getBytes(ref(storageAs("suspendedA"), `tenants/${TENANT_A}/documents/contract.pdf`)));
    await assertFails(uploadBytes(ref(storageAs("suspendedA"), `tenants/${TENANT_A}/products/x.png`), bytes(), png));
  });
});

describe("storage permissions", () => {
  it("cashiers cannot upload menu images or delete files", async () => {
    await assertFails(uploadBytes(ref(storageAs("cashierA"), `tenants/${TENANT_A}/products/new.png`), bytes(), png));
    await assertFails(deleteObject(ref(storageAs("cashierA"), `tenants/${TENANT_A}/products/dish.png`)));
  });

  it("managers can upload menu images", async () => {
    await assertSucceeds(uploadBytes(ref(storageAs("managerA"), `tenants/${TENANT_A}/products/new.png`), bytes(), png));
  });

  it("chefs cannot read invoices; owners can", async () => {
    await assertFails(getBytes(ref(storageAs("chefA"), `tenants/${TENANT_A}/invoices/inv1.pdf`)));
    await assertSucceeds(getBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/invoices/inv1.pdf`)));
  });

  it("public brand and menu images are readable without sign-in", async () => {
    await assertSucceeds(getBytes(ref(anonStorage(), `tenants/${TENANT_A}/products/dish.png`)));
  });
});

describe("storage upload validation", () => {
  it("rejects disallowed MIME types, including SVG and HTML", async () => {
    await assertFails(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/branding/a.svg`), bytes(), { contentType: "image/svg+xml" }));
    await assertFails(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/branding/a.html`), bytes(), { contentType: "text/html" }));
  });

  it("rejects oversized images", async () => {
    await assertFails(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/branding/big.png`), bytes(5 * 1024 * 1024 + 1), png));
  });

  it("accepts PDFs for documents but not for product images", async () => {
    const pdf = { contentType: "application/pdf" };
    await assertSucceeds(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/documents/new.pdf`), bytes(), pdf));
    await assertFails(uploadBytes(ref(storageAs("ownerA"), `tenants/${TENANT_A}/products/new.pdf`), bytes(), pdf));
  });
});
