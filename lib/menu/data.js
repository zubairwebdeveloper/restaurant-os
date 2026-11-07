import "server-only";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_CURRENCY, LIMITS } from "@/config/menu";
import { toSerializable } from "@/lib/utils/serialize";

const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

/** Menu for the editor. Verifies MENU_MANAGE for the active tenant first; reads only that tenant's paths. */
export async function loadMenu() {
  const { access } = await requireTenantPermission("MENU_MANAGE");
  const db = getAdminDb();
  const t = access.tenantId;
  const [tenantSnap, catSnap, prodSnap] = await Promise.all([
    db.doc(`tenants/${t}`).get(),
    db.collection(`tenants/${t}/categories`).limit(LIMITS.MAX_CATEGORIES + 1).get(),
    db.collection(`tenants/${t}/products`).limit(LIMITS.MAX_PRODUCTS + 1).get(),
  ]);
  const tenant = tenantSnap.data() ?? {};
  const meta = { version: 0, publishedVersion: null, published: false, productCount: 0, ...(tenant.menuMeta ?? {}) };
  return {
    currency: tenant.settings?.currency ?? DEFAULT_CURRENCY,
    meta: { version: meta.version, publishedVersion: meta.publishedVersion, published: meta.published === true },
    categories: catSnap.docs.map((d) => toSerializable({ id: d.id, ...d.data() })).sort(bySort),
    products: prodSnap.docs.map((d) => toSerializable({ id: d.id, ...d.data() })).sort(bySort),
  };
}
