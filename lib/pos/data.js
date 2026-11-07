import "server-only";
import { requireAnyTenantPermission, requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { LIMITS } from "@/config/menu";
import { bpToInput } from "@/lib/utils/money";
import { toSerializable } from "@/lib/utils/serialize";
import { readPosSettings } from "./pricing";

const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
const dropInternal = ({ requestHash, ...rest }) => rest;

/** Everything the POS screen needs. Requires POS_CREATE; reads only the active tenant's paths. */
export async function loadPos() {
  const { access } = await requireTenantPermission("POS_CREATE");
  const db = getAdminDb();
  const t = access.tenantId;
  const [tenantSnap, catSnap, prodSnap] = await Promise.all([
    db.doc(`tenants/${t}`).get(),
    db.collection(`tenants/${t}/categories`).limit(LIMITS.MAX_CATEGORIES + 1).get(),
    db.collection(`tenants/${t}/products`).limit(LIMITS.MAX_PRODUCTS + 1).get(),
  ]);
  const tenant = tenantSnap.data() ?? {};
  return {
    tenantName: tenant.profile?.name ?? "Restaurant",
    settings: readPosSettings(tenant.settings),
    canDiscount: access.permissions.includes("POS_DISCOUNT"),
    categories: catSnap.docs.map((d) => toSerializable({ id: d.id, ...d.data() })).sort(bySort),
    products: prodSnap.docs.map((d) => toSerializable({ id: d.id, ...d.data() })).sort(bySort),
  };
}

/** Latest orders for history and management, with what the caller is allowed to do. Requires ORDERS_READ. */
export async function loadOrders() {
  const { access } = await requireAnyTenantPermission(["ORDERS_READ"]);
  const db = getAdminDb();
  const t = access.tenantId;
  const [tenantSnap, orderSnap] = await Promise.all([
    db.doc(`tenants/${t}`).get(),
    db.collection(`tenants/${t}/orders`).orderBy("createdAt", "desc").limit(200).get(),
  ]);
  const tenant = tenantSnap.data() ?? {};
  const can = (p) => access.permissions.includes(p);
  return {
    tenantName: tenant.profile?.name ?? "Restaurant",
    settings: readPosSettings(tenant.settings),
    orders: orderSnap.docs.map((d) => toSerializable({ id: d.id, ...dropInternal(d.data()) })),
    can: { takePayment: can("POS_CREATE"), cancel: can("ORDERS_UPDATE"), refund: can("ORDERS_REFUND"), fulfil: can("ORDERS_UPDATE") || can("KITCHEN_UPDATE") },
  };
}

/** Settings as form text. Requires SETTINGS_MANAGE. */
export async function loadSettingsForm() {
  const { access } = await requireTenantPermission("SETTINGS_MANAGE");
  const tenant = (await getAdminDb().doc(`tenants/${access.tenantId}`).get()).data() ?? {};
  const s = readPosSettings(tenant.settings);
  return {
    currency: s.currency,
    taxPercent: bpToInput(s.taxBp),
    servicePercent: bpToInput(s.serviceBp),
    taxLabel: s.taxLabel,
    taxRegistration: s.taxRegistration,
    receiptFooter: s.receiptFooter,
  };
}
