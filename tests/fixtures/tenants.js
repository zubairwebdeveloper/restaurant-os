import { permissionsForRole } from "@/config/permissions";

export const PROJECT_ID = "demo-restaurant-os";
export const TENANT_A = "GreenLagoonTenant0001";
export const TENANT_B = "CityCafeTenant0000002";
export const TENANT_PENDING = "PendingTenant00000003";

const member = (uid, role, status = "ACTIVE") => ({ uid, role, status, permissions: permissionsForRole(role) });

/** Firestore documents (path -> data) used to seed the emulator. */
export const SEED_DOCS = {
  [`tenants/${TENANT_A}`]: { status: "ACTIVE", profile: { name: "Demo A" }, subscription: { plan: "STARTER" }, ownerUid: "ownerA" },
  [`tenants/${TENANT_B}`]: { status: "ACTIVE", profile: { name: "Demo B" }, subscription: { plan: "STARTER" }, ownerUid: "ownerB" },
  [`tenants/${TENANT_PENDING}`]: { status: "PENDING", profile: { name: "Demo C" }, ownerUid: "ownerC" },

  [`tenants/${TENANT_A}/members/ownerA`]: member("ownerA", "OWNER"),
  [`tenants/${TENANT_A}/members/managerA`]: member("managerA", "MANAGER"),
  [`tenants/${TENANT_A}/members/cashierA`]: member("cashierA", "CASHIER"),
  [`tenants/${TENANT_A}/members/chefA`]: member("chefA", "CHEF"),
  [`tenants/${TENANT_A}/members/suspendedA`]: member("suspendedA", "MANAGER", "SUSPENDED"),
  [`tenants/${TENANT_B}/members/ownerB`]: member("ownerB", "OWNER"),
  [`tenants/${TENANT_PENDING}/members/ownerC`]: member("ownerC", "OWNER"),

  [`tenants/${TENANT_A}/products/pPublic`]: { tenantId: TENANT_A, name: "Karahi", visibility: "PUBLIC" },
  [`tenants/${TENANT_A}/products/pPrivate`]: { tenantId: TENANT_A, name: "Staff meal", visibility: "PRIVATE" },
  [`tenants/${TENANT_B}/products/pB`]: { tenantId: TENANT_B, name: "Latte", visibility: "PRIVATE" },
  [`tenants/${TENANT_PENDING}/products/pC`]: { tenantId: TENANT_PENDING, name: "Draft", visibility: "PUBLIC" },

  [`tenants/${TENANT_A}/tables/t1`]: { tenantId: TENANT_A, name: "Table 1" },
  [`tenants/${TENANT_A}/orders/o1`]: { tenantId: TENANT_A, total: 1200 },
  [`tenants/${TENANT_A}/transactions/t1`]: { tenantId: TENANT_A, amount: 1200 },
  [`tenants/${TENANT_B}/transactions/tB`]: { tenantId: TENANT_B, amount: 500 },

  "platformUsers/root": { role: "SUPER_ADMIN", status: "ACTIVE" },
  "tenantApplications/appExisting": {
    ownerUid: "someoneElse", restaurantName: "Other", businessType: "CAFE", city: "X", country: "Y", phone: "123456", status: "PENDING",
  },
};
