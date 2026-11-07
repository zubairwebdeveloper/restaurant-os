import { AUDIT_ACTIONS } from "@/config/platform";
import { DEFAULT_CURRENCY, LIMITS } from "@/config/menu";
import { PlatformError } from "@/lib/platform/errors";
import { defaultNewId, normalizeProduct } from "./normalize";
import { validateOrder } from "./order";

/**
 * Trusted server-side menu operations. Callers MUST first run requireTenantPermission("MENU_MANAGE")
 * and validate input with schemas/menu.schema.js. Every function is ONE transaction scoped to
 * tenants/{tenantId}/..., so a category or product from another tenant can never be reached.
 *
 * tenants/{id}.menuMeta tracks { version, publishedVersion, published, productCount }:
 * every change bumps `version`, and publishing copies the public part of the menu into a single
 * publicMenus/{tenantId} document so public pages cost one read instead of hundreds.
 */

const categories = (db, t) => db.collection(`tenants/${t}/categories`);
const products = (db, t) => db.collection(`tenants/${t}/products`);
const metaOf = (tenant) => ({ version: 0, publishedVersion: null, published: false, productCount: 0, ...(tenant.menuMeta ?? {}) });

async function loadActiveTenant(tx, ref) {
  const snap = await tx.get(ref);
  if (!snap.exists) throw new PlatformError("TENANT_NOT_FOUND", 404);
  const tenant = snap.data();
  if (tenant.status !== "ACTIVE") throw new PlatformError("TENANT_NOT_ACTIVE", 403);
  return tenant;
}

function record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity, op, id, serverTimestamp, metaPatch = {} }) {
  const meta = metaOf(tenant);
  tx.update(tenantRef, { menuMeta: { ...meta, ...metaPatch, version: meta.version + 1 }, updatedAt: serverTimestamp });
  tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
    tenantId, action: AUDIT_ACTIONS.MENU_CHANGED, actorUid, details: { entity, op, id }, createdAt: serverTimestamp,
  });
}

const nextSortOrder = (docs) => docs.reduce((max, d) => Math.max(max, d.data().sortOrder ?? 0), -1) + 1;

// ---------------------------------------------------------------- categories
export async function createCategory(db, { tenantId, actorUid, input, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = categories(db, tenantId).doc();
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const existing = await tx.get(categories(db, tenantId).limit(LIMITS.MAX_CATEGORIES + 1));
    if (existing.docs.length >= LIMITS.MAX_CATEGORIES) throw new PlatformError("LIMIT_REACHED", 409);
    tx.set(ref, { tenantId, ...input, sortOrder: nextSortOrder(existing.docs), createdAt: serverTimestamp, updatedAt: serverTimestamp });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "category", op: "create", id: ref.id, serverTimestamp });
    return { id: ref.id };
  });
}

export async function updateCategory(db, { tenantId, actorUid, categoryId, input, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = db.doc(`tenants/${tenantId}/categories/${categoryId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    if (!(await tx.get(ref)).exists) throw new PlatformError("CATEGORY_NOT_FOUND", 404);
    tx.update(ref, { ...input, updatedAt: serverTimestamp });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "category", op: "update", id: categoryId, serverTimestamp });
    return { id: categoryId };
  });
}

export async function deleteCategory(db, { tenantId, actorUid, categoryId, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = db.doc(`tenants/${tenantId}/categories/${categoryId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    if (!(await tx.get(ref)).exists) throw new PlatformError("CATEGORY_NOT_FOUND", 404);
    const inUse = await tx.get(products(db, tenantId).where("categoryId", "==", categoryId).limit(1));
    if (inUse.docs.length > 0) throw new PlatformError("CATEGORY_NOT_EMPTY", 409);
    tx.delete(ref);
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "category", op: "delete", id: categoryId, serverTimestamp });
    return { id: categoryId };
  });
}

export async function reorderCategories(db, { tenantId, actorUid, orderedIds, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const existing = await tx.get(categories(db, tenantId).limit(LIMITS.MAX_CATEGORIES + 1));
    validateOrder(existing.docs.map((d) => d.id), orderedIds);
    const current = new Map(existing.docs.map((d) => [d.id, d.data().sortOrder]));
    orderedIds.forEach((id, index) => {
      if (current.get(id) !== index) tx.update(db.doc(`tenants/${tenantId}/categories/${id}`), { sortOrder: index, updatedAt: serverTimestamp });
    });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "category", op: "reorder", id: "all", serverTimestamp });
    return { count: orderedIds.length };
  });
}

// ------------------------------------------------------------------ products
async function assertCategory(tx, db, tenantId, categoryId) {
  if (!(await tx.get(db.doc(`tenants/${tenantId}/categories/${categoryId}`))).exists) throw new PlatformError("CATEGORY_NOT_FOUND", 404);
}

async function productsInCategory(tx, db, tenantId, categoryId) {
  return tx.get(products(db, tenantId).where("categoryId", "==", categoryId).limit(LIMITS.MAX_PRODUCTS_PER_CATEGORY + 1));
}

export async function createProduct(db, { tenantId, actorUid, input, serverTimestamp, newId = defaultNewId }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = products(db, tenantId).doc();
  const data = normalizeProduct(input, newId);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const meta = metaOf(tenant);
    if (meta.productCount >= LIMITS.MAX_PRODUCTS) throw new PlatformError("LIMIT_REACHED", 409);
    await assertCategory(tx, db, tenantId, data.categoryId);
    const siblings = await productsInCategory(tx, db, tenantId, data.categoryId);
    if (siblings.docs.length >= LIMITS.MAX_PRODUCTS_PER_CATEGORY) throw new PlatformError("LIMIT_REACHED", 409);
    tx.set(ref, { tenantId, ...data, sortOrder: nextSortOrder(siblings.docs), createdAt: serverTimestamp, updatedAt: serverTimestamp });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "product", op: "create", id: ref.id, serverTimestamp, metaPatch: { productCount: meta.productCount + 1 } });
    return { id: ref.id };
  });
}

export async function updateProduct(db, { tenantId, actorUid, productId, input, serverTimestamp, newId = defaultNewId }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = db.doc(`tenants/${tenantId}/products/${productId}`);
  const data = normalizeProduct(input, newId);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new PlatformError("PRODUCT_NOT_FOUND", 404);
    const patch = { ...data, updatedAt: serverTimestamp };
    if (snap.data().categoryId !== data.categoryId) {
      await assertCategory(tx, db, tenantId, data.categoryId);
      const siblings = await productsInCategory(tx, db, tenantId, data.categoryId);
      if (siblings.docs.length >= LIMITS.MAX_PRODUCTS_PER_CATEGORY) throw new PlatformError("LIMIT_REACHED", 409);
      patch.sortOrder = nextSortOrder(siblings.docs); // moved: goes to the end of its new category
    }
    tx.update(ref, patch);
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "product", op: "update", id: productId, serverTimestamp });
    return { id: productId };
  });
}

export async function setProductAvailability(db, { tenantId, actorUid, productId, available, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = db.doc(`tenants/${tenantId}/products/${productId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    if (!(await tx.get(ref)).exists) throw new PlatformError("PRODUCT_NOT_FOUND", 404);
    tx.update(ref, { available, updatedAt: serverTimestamp });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "product", op: available ? "available" : "unavailable", id: productId, serverTimestamp });
    return { available };
  });
}

export async function deleteProduct(db, { tenantId, actorUid, productId, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const ref = db.doc(`tenants/${tenantId}/products/${productId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    if (!(await tx.get(ref)).exists) throw new PlatformError("PRODUCT_NOT_FOUND", 404);
    tx.delete(ref);
    record(db, tx, tenantRef, tenant, {
      tenantId, actorUid, entity: "product", op: "delete", id: productId, serverTimestamp,
      metaPatch: { productCount: Math.max(0, metaOf(tenant).productCount - 1) },
    });
    return { id: productId };
  });
}

export async function reorderProducts(db, { tenantId, actorUid, categoryId, orderedIds, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    await assertCategory(tx, db, tenantId, categoryId);
    const siblings = await productsInCategory(tx, db, tenantId, categoryId);
    validateOrder(siblings.docs.map((d) => d.id), orderedIds);
    const current = new Map(siblings.docs.map((d) => [d.id, d.data().sortOrder]));
    orderedIds.forEach((id, index) => {
      if (current.get(id) !== index) tx.update(db.doc(`tenants/${tenantId}/products/${id}`), { sortOrder: index, updatedAt: serverTimestamp });
    });
    record(db, tx, tenantRef, tenant, { tenantId, actorUid, entity: "product", op: "reorder", id: categoryId, serverTimestamp });
    return { count: orderedIds.length };
  });
}

// ---------------------------------------------------------------- publishing
const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

/** Builds the public menu snapshot: PUBLIC categories and products only, empty categories dropped. */
export function buildMenuSnapshot({ tenantId, categories: cats, products: prods, currency, publishedVersion, serverTimestamp }) {
  const publicCategories = cats.filter((c) => c.visibility === "PUBLIC").sort(bySort);
  const groups = publicCategories
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      items: prods
        .filter((p) => p.categoryId === c.id && p.visibility === "PUBLIC")
        .sort(bySort)
        .map((p) => ({
          id: p.id, name: p.name, description: p.description ?? "", priceMinor: p.priceMinor,
          variants: p.variants ?? [], modifierGroups: p.modifierGroups ?? [], dietary: p.dietary ?? [],
          prepTimeMinutes: p.prepTimeMinutes ?? 0, featured: p.featured === true, available: p.available !== false,
        })),
    }))
    .filter((g) => g.items.length > 0);
  return { tenantId, status: "ACTIVE", currency, categories: groups, publishedVersion, publishedAt: serverTimestamp };
}

export async function publishMenu(db, { tenantId, actorUid, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    const meta = metaOf(tenant);
    const [catSnap, prodSnap] = await Promise.all([
      tx.get(categories(db, tenantId).limit(LIMITS.MAX_CATEGORIES + 1)),
      tx.get(products(db, tenantId).limit(LIMITS.MAX_PRODUCTS + 1)),
    ]);
    const snapshot = buildMenuSnapshot({
      tenantId,
      categories: catSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      products: prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      currency: tenant.settings?.currency ?? DEFAULT_CURRENCY,
      publishedVersion: meta.version,
      serverTimestamp,
    });
    if (JSON.stringify(snapshot).length > LIMITS.MAX_SNAPSHOT_BYTES) throw new PlatformError("MENU_TOO_LARGE", 413);

    tx.set(db.doc(`publicMenus/${tenantId}`), snapshot);
    tx.update(tenantRef, { menuMeta: { ...meta, published: true, publishedVersion: meta.version }, updatedAt: serverTimestamp });
    tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
      tenantId, action: AUDIT_ACTIONS.MENU_PUBLISHED, actorUid, details: { items: snapshot.categories.reduce((n, c) => n + c.items.length, 0) }, createdAt: serverTimestamp,
    });
    return { categories: snapshot.categories.length, items: snapshot.categories.reduce((n, c) => n + c.items.length, 0) };
  });
}

export async function unpublishMenu(db, { tenantId, actorUid, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    tx.delete(db.doc(`publicMenus/${tenantId}`));
    tx.update(tenantRef, { menuMeta: { ...metaOf(tenant), published: false, publishedVersion: null }, updatedAt: serverTimestamp });
    tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), { tenantId, action: AUDIT_ACTIONS.MENU_UNPUBLISHED, actorUid, details: {}, createdAt: serverTimestamp });
    return { published: false };
  });
}
