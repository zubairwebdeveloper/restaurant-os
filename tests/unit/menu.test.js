import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatMoney, minorToInput, parseMoneyInput } from "@/lib/utils/money";
import { categorySchema, productSchema, reorderProductsSchema } from "@/schemas/menu.schema";
import { validateOrder } from "@/lib/menu/order";
import { normalizeProduct } from "@/lib/menu/normalize";
import {
  buildMenuSnapshot, createCategory, createProduct, deleteCategory, deleteProduct, publishMenu, reorderCategories,
  reorderProducts, setProductAvailability, unpublishMenu, updateCategory, updateProduct,
} from "@/lib/menu/menu";
import { getPublicSite, setSitePublished } from "@/lib/website/site-settings";
import { changeTenantStatus } from "@/lib/platform/tenant-lifecycle";
import { verifyTenantAccess } from "@/lib/security/tenant-access";
import PublicSite from "@/features/website/components/PublicSite";
import { LIMITS } from "@/config/menu";
import { createFakeFirestore } from "../fixtures/fake-firestore";

const TS = "SERVER_TS";
const T1 = "TenantAAAAAAAAAAAAAA";
const T2 = "TenantBBBBBBBBBBBBBB";
let counter = 0;
const newId = () => `entry-id-${String(++counter).padStart(6, "0")}`;
const base = { tenantId: T1, actorUid: "owner1", serverTimestamp: TS };
const seed = (extra = {}) =>
  createFakeFirestore({
    [`tenants/${T1}`]: { status: "ACTIVE", ownerUid: "owner1", profile: { name: "Green Lagoon" }, settings: { currency: "PKR" } },
    [`tenants/${T2}`]: { status: "ACTIVE", ownerUid: "owner2", profile: { name: "City Cafe" } },
    ...extra,
  });
const product = (categoryId, extra = {}) => ({
  categoryId, name: "Karahi", description: "Wok-cooked", priceMinor: 125000, variants: [], modifierGroups: [],
  dietary: ["HALAL"], prepTimeMinutes: 20, featured: false, available: true, visibility: "PUBLIC", ...extra,
});
const meta = (db, t = T1) => db._store.get(`tenants/${t}`).menuMeta;
const ids = (db, t, c) => db._all(`tenants/${t}/${c}/`).filter((p) => p.split("/").length === 4).map((p) => p.split("/")[3]);

describe("money", () => {
  it("parses only plain non-negative amounts with at most 2 decimals", () => {
    expect(parseMoneyInput("12.5")).toBe(1250);
    expect(parseMoneyInput("0.05")).toBe(5);
    expect(parseMoneyInput(" 100 ")).toBe(10000);
    for (const bad of ["", "-1", "1.234", "1,5", "abc", "1e3", "1.", ".5", null, undefined, 12, "1234567890"]) expect(parseMoneyInput(bad), String(bad)).toBeNull();
  });
  it("round-trips and formats without floating-point drift", () => {
    expect(minorToInput(1250)).toBe("12.50");
    expect(minorToInput(5)).toBe("0.05");
    expect(minorToInput(-1)).toBe("");
    expect(parseMoneyInput(minorToInput(1999))).toBe(1999);
    expect(formatMoney(125000, "PKR")).toBe("PKR 1,250.00");
    expect(parseMoneyInput("0.1") + parseMoneyInput("0.2")).toBe(30); // no 0.30000000000000004
  });
});

describe("menu schemas", () => {
  const cat = "AAAAAAAAAAAAAAAAAAAA";
  it("accepts a valid product and rejects bad prices", () => {
    expect(productSchema.safeParse(product(cat)).success).toBe(true);
    for (const priceMinor of [-1, 12.5, "100", LIMITS.MAX_PRICE_MINOR + 1, NaN]) expect(productSchema.safeParse(product(cat, { priceMinor })).success, String(priceMinor)).toBe(false);
  });
  it("strips unknown keys so clients cannot smuggle tenantId, sortOrder or ids", () => {
    const r = productSchema.parse({ ...product(cat), tenantId: "Evil", sortOrder: -5, createdAt: "x" });
    expect(r.tenantId).toBeUndefined();
    expect(r.sortOrder).toBeUndefined();
  });
  it("validates variants, modifier groups and dietary labels", () => {
    const group = { name: "Extras", min: 0, max: 2, options: [{ name: "Cheese", priceMinor: 5000 }, { name: "Egg", priceMinor: 3000 }] };
    expect(productSchema.safeParse(product(cat, { modifierGroups: [group] })).success).toBe(true);
    expect(productSchema.safeParse(product(cat, { modifierGroups: [{ ...group, max: 3 }] })).success).toBe(false); // max > options
    expect(productSchema.safeParse(product(cat, { modifierGroups: [{ ...group, min: 2, max: 1 }] })).success).toBe(false);
    expect(productSchema.safeParse(product(cat, { modifierGroups: [{ ...group, options: [] }] })).success).toBe(false);
    expect(productSchema.safeParse(product(cat, { modifierGroups: [{ ...group, options: [{ name: "A", priceMinor: 1 }, { name: "a", priceMinor: 1 }] , max: 1 }] })).success).toBe(false);
    const dup = [{ name: "Small", priceMinor: 100 }, { name: "small", priceMinor: 200 }];
    expect(productSchema.safeParse(product(cat, { variants: dup })).success).toBe(false);
    expect(productSchema.safeParse(product(cat, { variants: Array.from({ length: LIMITS.MAX_VARIANTS + 1 }, (_, i) => ({ name: `v${i}`, priceMinor: 1 })) })).success).toBe(false);
    expect(productSchema.safeParse(product(cat, { dietary: ["VEGAN", "ALIEN"] })).success).toBe(false);
    expect(productSchema.parse(product(cat, { dietary: ["VEGAN", "VEGAN"] })).dietary).toEqual(["VEGAN"]);
  });
  it("validates categories and reorder payloads", () => {
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(categorySchema.parse({ name: "Mains" })).toMatchObject({ visibility: "PUBLIC", description: "" });
    expect(reorderProductsSchema.safeParse({ categoryId: cat, orderedIds: ["../x"] }).success).toBe(false);
  });
  it("normalizes: stable ids, lowest-variant base price, required derived from min", () => {
    const parsed = productSchema.parse(product(cat, {
      priceMinor: 999999,
      variants: [{ name: "Large", priceMinor: 1500 }, { name: "Small", priceMinor: 900 }],
      modifierGroups: [{ name: "Sauce", min: 1, max: 1, options: [{ name: "Mild", priceMinor: 0 }] }, { name: "Extras", min: 0, max: 1, options: [{ name: "Egg", priceMinor: 100 }] }],
    }));
    const n = normalizeProduct(parsed, newId);
    expect(n.priceMinor).toBe(900);
    expect(n.variants.every((v) => v.id)).toBe(true);
    expect(n.modifierGroups.map((g) => g.required)).toEqual([true, false]);
    expect(n.modifierGroups[0].options[0].id).toBeTruthy();
    expect(normalizeProduct(n, newId).variants[0].id).toBe(n.variants[0].id); // existing ids are kept
  });
});

describe("validateOrder", () => {
  it("requires exactly the existing ids", () => {
    expect(() => validateOrder(["a", "b", "c"], ["c", "a", "b"])).not.toThrow();
    for (const bad of [["a", "b"], ["a", "b", "c", "d"], ["a", "a", "b"], ["a", "b", "x"], []]) expect(() => validateOrder(["a", "b", "c"], bad)).toThrow(/INVALID_ORDER/);
  });
});

describe("categories", () => {
  it("creates in order, bumps the version and writes an audit entry", async () => {
    const db = seed();
    const a = await createCategory(db, { ...base, input: categorySchema.parse({ name: "Starters" }) });
    const b = await createCategory(db, { ...base, input: categorySchema.parse({ name: "Mains" }) });
    expect(db._store.get(`tenants/${T1}/categories/${a.id}`)).toMatchObject({ tenantId: T1, name: "Starters", sortOrder: 0 });
    expect(db._store.get(`tenants/${T1}/categories/${b.id}`).sortOrder).toBe(1);
    expect(meta(db).version).toBe(2);
    expect(db._all(`tenants/${T1}/auditLogs/`)).toHaveLength(2);
  });

  it("enforces the category limit", async () => {
    const full = Object.fromEntries(Array.from({ length: LIMITS.MAX_CATEGORIES }, (_, i) => [`tenants/${T1}/categories/c${i}`, { sortOrder: i }]));
    await expect(createCategory(seed(full), { ...base, input: categorySchema.parse({ name: "One too many" }) })).rejects.toMatchObject({ code: "LIMIT_REACHED" });
  });

  it("updates, and cannot touch another tenant's category", async () => {
    const db = seed({ [`tenants/${T2}/categories/Foreign`]: { tenantId: T2, name: "Theirs", sortOrder: 0 } });
    const { id } = await createCategory(db, { ...base, input: categorySchema.parse({ name: "Mine" }) });
    await updateCategory(db, { ...base, categoryId: id, input: categorySchema.parse({ name: "Renamed" }) });
    expect(db._store.get(`tenants/${T1}/categories/${id}`).name).toBe("Renamed");
    await expect(updateCategory(db, { ...base, categoryId: "Foreign", input: categorySchema.parse({ name: "Hijack" }) })).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    expect(db._store.get(`tenants/${T2}/categories/Foreign`).name).toBe("Theirs");
  });

  it("refuses to delete a category that still has products", async () => {
    const db = seed();
    const { id } = await createCategory(db, { ...base, input: categorySchema.parse({ name: "Mains" }) });
    const p = await createProduct(db, { ...base, input: productSchema.parse(product(id)), newId });
    await expect(deleteCategory(db, { ...base, categoryId: id })).rejects.toMatchObject({ code: "CATEGORY_NOT_EMPTY", status: 409 });
    await deleteProduct(db, { ...base, productId: p.id });
    await expect(deleteCategory(db, { ...base, categoryId: id })).resolves.toEqual({ id });
  });

  it("reorders atomically and rejects malformed orders", async () => {
    const db = seed();
    const made = [];
    for (const name of ["A", "B", "C"]) made.push((await createCategory(db, { ...base, input: categorySchema.parse({ name }) })).id);
    await reorderCategories(db, { ...base, orderedIds: [made[2], made[0], made[1]] });
    expect(made.map((id) => db._store.get(`tenants/${T1}/categories/${id}`).sortOrder)).toEqual([1, 2, 0]);
    await expect(reorderCategories(db, { ...base, orderedIds: [made[0], made[1]] })).rejects.toMatchObject({ code: "INVALID_ORDER" });
    await expect(reorderCategories(db, { ...base, orderedIds: [made[0], made[0], made[1]] })).rejects.toMatchObject({ code: "INVALID_ORDER" });
  });
});

describe("products", () => {
  async function withCategory() {
    const db = seed();
    const { id } = await createCategory(db, { ...base, input: categorySchema.parse({ name: "Mains" }) });
    return { db, categoryId: id };
  }

  it("creates a product with ids, tenantId, sort order and a counter", async () => {
    const { db, categoryId } = await withCategory();
    const a = await createProduct(db, { ...base, input: productSchema.parse(product(categoryId)), newId });
    const b = await createProduct(db, { ...base, input: productSchema.parse(product(categoryId, { name: "Biryani" })), newId });
    expect(db._store.get(`tenants/${T1}/products/${a.id}`)).toMatchObject({ tenantId: T1, categoryId, priceMinor: 125000, sortOrder: 0 });
    expect(db._store.get(`tenants/${T1}/products/${b.id}`).sortOrder).toBe(1);
    expect(meta(db).productCount).toBe(2);
  });

  it("rejects a category that belongs to another tenant or does not exist", async () => {
    const db = seed({ [`tenants/${T2}/categories/ForeignCat`]: { tenantId: T2, name: "Theirs" } });
    await expect(createProduct(db, { ...base, input: productSchema.parse(product("AAAAAAAAAAAAAAAAAAAA")), newId })).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
    expect(ids(db, T1, "products")).toHaveLength(0);
    expect(ids(db, T2, "products")).toHaveLength(0);
  });

  it("enforces total and per-category limits", async () => {
    const { db, categoryId } = await withCategory();
    db._store.set(`tenants/${T1}`, { ...db._store.get(`tenants/${T1}`), menuMeta: { version: 1, productCount: LIMITS.MAX_PRODUCTS } });
    await expect(createProduct(db, { ...base, input: productSchema.parse(product(categoryId)), newId })).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    const CAT = "CategoryAAAAAAAAAAAA"; // 20 chars
    const crowded = seed({
      [`tenants/${T1}/categories/${CAT}`]: { tenantId: T1, name: "Full", sortOrder: 0 },
      ...Object.fromEntries(Array.from({ length: LIMITS.MAX_PRODUCTS_PER_CATEGORY }, (_, i) => [`tenants/${T1}/products/p${i}`, { categoryId: CAT, sortOrder: i }])),
    });
    await expect(createProduct(crowded, { ...base, input: productSchema.parse(product(CAT)), newId })).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(ids(crowded, T1, "products")).toHaveLength(LIMITS.MAX_PRODUCTS_PER_CATEGORY); // nothing was added
  });

  it("updates in place, keeps tenantId and createdAt, and moves between categories to the end", async () => {
    const { db, categoryId } = await withCategory();
    const other = (await createCategory(db, { ...base, input: categorySchema.parse({ name: "Drinks" }) })).id;
    const p = await createProduct(db, { ...base, input: productSchema.parse(product(categoryId)), newId });
    await createProduct(db, { ...base, input: productSchema.parse(product(other, { name: "Tea" })), newId });
    await updateProduct(db, { ...base, productId: p.id, input: productSchema.parse(product(other, { name: "Karahi Deluxe", priceMinor: 150000 })), newId });
    const saved = db._store.get(`tenants/${T1}/products/${p.id}`);
    expect(saved).toMatchObject({ tenantId: T1, categoryId: other, name: "Karahi Deluxe", priceMinor: 150000, sortOrder: 1, createdAt: TS });
  });

  it("toggles availability and deletes, keeping the counter right", async () => {
    const { db, categoryId } = await withCategory();
    const p = await createProduct(db, { ...base, input: productSchema.parse(product(categoryId)), newId });
    await setProductAvailability(db, { ...base, productId: p.id, available: false });
    expect(db._store.get(`tenants/${T1}/products/${p.id}`).available).toBe(false);
    await deleteProduct(db, { ...base, productId: p.id });
    expect(db._store.has(`tenants/${T1}/products/${p.id}`)).toBe(false);
    expect(meta(db).productCount).toBe(0);
    await expect(deleteProduct(db, { ...base, productId: p.id })).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });

  it("reorders products within a category only", async () => {
    const { db, categoryId } = await withCategory();
    const made = [];
    for (const name of ["A", "B", "C"]) made.push((await createProduct(db, { ...base, input: productSchema.parse(product(categoryId, { name })), newId })).id);
    await reorderProducts(db, { ...base, categoryId, orderedIds: [made[1], made[2], made[0]] });
    expect(made.map((id) => db._store.get(`tenants/${T1}/products/${id}`).sortOrder)).toEqual([2, 0, 1]);
    await expect(reorderProducts(db, { ...base, categoryId, orderedIds: [made[0]] })).rejects.toMatchObject({ code: "INVALID_ORDER" });
  });

  it("concurrent creates never collide on ids or lose counter updates", async () => {
    const { db, categoryId } = await withCategory();
    await Promise.all(["A", "B", "C", "D"].map((name) => createProduct(db, { ...base, input: productSchema.parse(product(categoryId, { name })), newId })));
    expect(ids(db, T1, "products")).toHaveLength(4);
    expect(meta(db).productCount).toBe(4);
    const orders = ids(db, T1, "products").map((id) => db._store.get(`tenants/${T1}/products/${id}`).sortOrder).sort();
    expect(orders).toEqual([0, 1, 2, 3]);
  });

  it("is rejected for suspended or unknown tenants", async () => {
    const db = seed({ [`tenants/${T1}`]: { status: "SUSPENDED" } });
    await expect(createCategory(db, { ...base, input: categorySchema.parse({ name: "X" }) })).rejects.toMatchObject({ code: "TENANT_NOT_ACTIVE", status: 403 });
    await expect(createCategory(seed(), { ...base, tenantId: "Missing00000000000000", input: categorySchema.parse({ name: "X" }) })).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });

  it("menu changes do not grant or remove any access", async () => {
    const db = seed({ [`tenants/${T1}/members/cashier1`]: { uid: "cashier1", role: "CASHIER", status: "ACTIVE", permissions: ["POS_READ"] } });
    await expect(verifyTenantAccess(db, { uid: "cashier1", tenantId: T1, permission: "MENU_MANAGE" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("publishing the menu", () => {
  async function menuDb() {
    const db = seed({
      [`tenants/${T1}`]: { status: "ACTIVE", ownerUid: "owner1", profile: { name: "Green Lagoon" }, settings: { currency: "USD" }, branding: { template: "premium-restaurant", fontPairing: "editorial", primaryColor: "#1C2330" }, website: { slug: "green-lagoon", hero: { headline: "Hi" }, about: {}, contact: {}, hours: [], social: {}, seo: {}, published: false } },
    });
    const mains = (await createCategory(db, { ...base, input: categorySchema.parse({ name: "Mains" }) })).id;
    const secret = (await createCategory(db, { ...base, input: categorySchema.parse({ name: "Staff only", visibility: "PRIVATE" }) })).id;
    const empty = (await createCategory(db, { ...base, input: categorySchema.parse({ name: "Empty" }) })).id;
    await createProduct(db, { ...base, input: productSchema.parse(product(mains)), newId });
    await createProduct(db, { ...base, input: productSchema.parse(product(mains, { name: "Hidden dish", visibility: "PRIVATE" })), newId });
    await createProduct(db, { ...base, input: productSchema.parse(product(secret, { name: "Staff meal" })), newId });
    return { db, mains, secret, empty };
  }

  it("publishes only PUBLIC items in PUBLIC categories and drops empty categories", async () => {
    const { db } = await menuDb();
    const result = await publishMenu(db, base);
    expect(result).toEqual({ categories: 1, items: 1 });
    const snap = db._store.get(`publicMenus/${T1}`);
    expect(snap).toMatchObject({ tenantId: T1, status: "ACTIVE", currency: "USD" });
    const json = JSON.stringify(snap);
    expect(json).toContain("Karahi");
    for (const secret of ["Hidden dish", "Staff meal", "Staff only", "Empty", "owner1"]) expect(json).not.toContain(secret);
    expect(meta(db)).toMatchObject({ published: true, publishedVersion: meta(db).version });
  });

  it("tracks unpublished changes through the version counter", async () => {
    const { db, mains } = await menuDb();
    await publishMenu(db, base);
    const published = meta(db).publishedVersion;
    await createProduct(db, { ...base, input: productSchema.parse(product(mains, { name: "New" })), newId });
    expect(meta(db).version).toBeGreaterThan(published);
    expect(meta(db).publishedVersion).toBe(published);
    await publishMenu(db, base);
    expect(meta(db).publishedVersion).toBe(meta(db).version);
  });

  it("refuses a snapshot that would exceed the document size limit", async () => {
    const { db, mains } = await menuDb();
    for (let i = 0; i < 20; i++) db._store.set(`tenants/${T1}/products/big${i}`, { ...product(mains, { name: `Big ${i}`, description: "x".repeat(60000) }), sortOrder: 10 + i, tenantId: T1 });
    await expect(publishMenu(db, base)).rejects.toMatchObject({ code: "MENU_TOO_LARGE", status: 413 });
    expect(db._store.has(`publicMenus/${T1}`)).toBe(false);
  });

  it("unpublishes by removing the public copy", async () => {
    const { db } = await menuDb();
    await publishMenu(db, base);
    await unpublishMenu(db, base);
    expect(db._store.has(`publicMenus/${T1}`)).toBe(false);
    expect(meta(db)).toMatchObject({ published: false, publishedVersion: null });
  });

  it("buildMenuSnapshot sorts by sortOrder and marks sold-out items", () => {
    const snap = buildMenuSnapshot({
      tenantId: T1, currency: "PKR", publishedVersion: 3, serverTimestamp: TS,
      categories: [{ id: "c2", name: "B", visibility: "PUBLIC", sortOrder: 1 }, { id: "c1", name: "A", visibility: "PUBLIC", sortOrder: 0 }],
      products: [{ id: "p2", categoryId: "c1", name: "Two", visibility: "PUBLIC", sortOrder: 1, priceMinor: 1, available: false }, { id: "p1", categoryId: "c1", name: "One", visibility: "PUBLIC", sortOrder: 0, priceMinor: 1 }],
    });
    expect(snap.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(snap.categories[0].items.map((i) => [i.name, i.available])).toEqual([["One", true], ["Two", false]]);
  });

  it("the public site serves the menu while published and hides it on suspension", async () => {
    const { db } = await menuDb();
    await setSitePublished(db, { ...base, published: true });
    expect((await getPublicSite(db, "green-lagoon")).menu).toBeNull(); // menu not published yet
    await publishMenu(db, base);
    const site = await getPublicSite(db, "green-lagoon");
    expect(site.menu.categories[0].items[0].name).toBe("Karahi");
    expect(JSON.stringify(site)).not.toContain("Staff meal");
    await changeTenantStatus(db, { tenantId: T1, action: "SUSPEND", adminUid: "root", reason: "Policy breach", serverTimestamp: TS });
    expect(db._store.get(`publicMenus/${T1}`).status).toBe("SUSPENDED");
    expect(await getPublicSite(db, "green-lagoon")).toBeNull();
    await changeTenantStatus(db, { tenantId: T1, action: "REACTIVATE", adminUid: "root", serverTimestamp: TS });
    expect((await getPublicSite(db, "green-lagoon")).menu).not.toBeNull();
  });
});

describe("public menu rendering", () => {
  const site = (items) => ({
    name: "Green Lagoon",
    branding: { template: "premium-restaurant", fontPairing: "editorial", primaryColor: "#1C2330", tagline: "" },
    website: { slug: "x", hero: { headline: "Hi", subheadline: "", ctaLabel: "", ctaUrl: "" }, about: { title: "", body: "" }, contact: {}, hours: [], social: {}, seo: {} },
    menu: { currency: "PKR", categories: [{ id: "c1", name: "Mains", description: "Hot", items }] },
  });
  const item = (extra = {}) => ({ id: "i1", name: "Karahi", description: "Wok", priceMinor: 125000, variants: [], modifierGroups: [], dietary: ["HALAL"], prepTimeMinutes: 0, featured: false, available: true, ...extra });
  const render = (s) => renderToStaticMarkup(createElement(PublicSite, { site: s }));

  it("shows prices, dietary labels, variants and sold-out state", () => {
    const html = render(site([item(), item({ id: "i2", name: "Tea", variants: [{ id: "v1", name: "Small", priceMinor: 5000 }, { id: "v2", name: "Large", priceMinor: 8000 }], dietary: [], available: false, featured: true })]));
    expect(html).toContain('id="menu"');
    expect(html).toContain("PKR 1,250.00");
    expect(html).toContain("Halal");
    expect(html).toContain("from ");
    expect(html).toContain("Small PKR 50.00");
    expect(html).toContain("Sold out");
    expect(html).toContain("Featured");
  });

  it("escapes menu text and omits the section when there is no menu", () => {
    const evil = "<img src=x onerror=alert(1)>";
    const html = render(site([item({ name: evil, description: evil })]));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    const none = { ...site([]), menu: null };
    expect(render(none)).not.toContain('id="menu"');
  });
});

describe("product form conversion", () => {
  it("round-trips a stored product through the form and back", async () => {
    const { toProductForm, toProductInput, productFormSchema } = await import("@/lib/menu/form");
    const stored = normalizeProduct(productSchema.parse(product("AAAAAAAAAAAAAAAAAAAA", {
      variants: [{ name: "Small", priceMinor: 90000 }, { name: "Large", priceMinor: 150000 }],
      modifierGroups: [{ name: "Sauce", min: 1, max: 1, options: [{ name: "Mild", priceMinor: 0 }, { name: "Hot", priceMinor: 500 }] }],
    })), newId);
    const form = toProductForm(stored);
    expect(form.variants[1]).toMatchObject({ name: "Large", price: "1500.00" });
    const parsed = productFormSchema.safeParse(form);
    expect(parsed.success).toBe(true);
    const input = toProductInput(parsed.data);
    expect(input.variants.map((v) => v.priceMinor)).toEqual([90000, 150000]);
    expect(input.variants[0].id).toBe(stored.variants[0].id); // ids survive an edit
    expect(input.modifierGroups[0].options[1]).toMatchObject({ name: "Hot", priceMinor: 500 });
    expect(productSchema.safeParse(input).success).toBe(true);
  });

  it("validates typed prices and group limits in the form", async () => {
    const { productFormSchema, toProductForm } = await import("@/lib/menu/form");
    const blank = { ...toProductForm(null, "AAAAAAAAAAAAAAAAAAAA"), name: "Tea" };
    expect(productFormSchema.safeParse({ ...blank, price: "" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...blank, price: "12.345" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...blank, price: "12.5" }).success).toBe(true);
    expect(productFormSchema.safeParse({ ...blank, price: "", variants: [{ name: "S", price: "5" }] }).success).toBe(true); // base price not needed with variants
    const group = { name: "G", min: "0", max: "3", options: [{ name: "A", price: "0" }] };
    expect(productFormSchema.safeParse({ ...blank, price: "1", modifierGroups: [group] }).success).toBe(false); // max > options
    expect(productFormSchema.parse({ ...blank, price: "1", modifierGroups: [{ ...group, max: "1" }] }).modifierGroups[0].max).toBe(1); // text coerced to a number
  });

  it("filters the product list", async () => {
    const { filterProducts } = await import("@/lib/menu/form");
    const list = [
      { id: "1", categoryId: "c1", name: "Chicken Karahi", description: "", dietary: ["HALAL"], available: true },
      { id: "2", categoryId: "c1", name: "Dal", description: "lentils", dietary: ["VEGAN"], available: false },
      { id: "3", categoryId: "c2", name: "Tea", description: "", dietary: [], available: true },
    ];
    expect(filterProducts(list, { categoryId: "c1" })).toHaveLength(2);
    expect(filterProducts(list, { search: "LENT" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(list, { availability: "UNAVAILABLE" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProducts(list, { dietary: "HALAL" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterProducts(list)).toHaveLength(3);
  });
});
