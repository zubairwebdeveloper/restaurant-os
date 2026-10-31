/**
 * Granular permissions and default role bundles.
 * Source of truth for server code. Firestore/Storage rules cannot import this file,
 * so they check the `permissions` array stored on each membership document
 * (written only by trusted server code, derived from these bundles).
 * tests/unit/permissions.test.js keeps the rules and this file in sync.
 */
export const PERMISSIONS = Object.freeze({
  POS_READ: "POS_READ",
  POS_CREATE: "POS_CREATE",
  ORDERS_READ: "ORDERS_READ",
  ORDERS_UPDATE: "ORDERS_UPDATE",
  KITCHEN_READ: "KITCHEN_READ",
  KITCHEN_UPDATE: "KITCHEN_UPDATE",
  MENU_MANAGE: "MENU_MANAGE",
  TABLES_MANAGE: "TABLES_MANAGE",
  RESERVATIONS_MANAGE: "RESERVATIONS_MANAGE",
  CUSTOMERS_READ: "CUSTOMERS_READ",
  CUSTOMERS_MANAGE: "CUSTOMERS_MANAGE",
  INVENTORY_READ: "INVENTORY_READ",
  INVENTORY_MANAGE: "INVENTORY_MANAGE",
  STAFF_MANAGE: "STAFF_MANAGE",
  FINANCIAL_READ: "FINANCIAL_READ",
  FINANCIAL_MANAGE: "FINANCIAL_MANAGE",
  REPORTS_READ: "REPORTS_READ",
  SETTINGS_MANAGE: "SETTINGS_MANAGE",
  AUDIT_READ: "AUDIT_READ",
});

export const TENANT_ROLES = Object.freeze([
  "OWNER", "MANAGER", "CASHIER", "CHEF", "WAITER", "INVENTORY_MANAGER", "ACCOUNTANT", "STAFF",
]);

export const PLATFORM_ROLES = Object.freeze(["SUPER_ADMIN", "PLATFORM_SUPPORT"]);

export const TENANT_STATUSES = Object.freeze(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "CANCELLED"]);
export const MEMBER_STATUSES = Object.freeze(["ACTIVE", "SUSPENDED", "REMOVED"]);

const ALL = Object.values(PERMISSIONS);
const P = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
  OWNER: ALL,
  MANAGER: ALL.filter((p) => p !== P.SETTINGS_MANAGE),
  CASHIER: [P.POS_READ, P.POS_CREATE, P.ORDERS_READ, P.CUSTOMERS_READ],
  CHEF: [P.KITCHEN_READ, P.KITCHEN_UPDATE, P.ORDERS_READ, P.INVENTORY_READ],
  WAITER: [P.POS_READ, P.POS_CREATE, P.ORDERS_READ, P.TABLES_MANAGE, P.RESERVATIONS_MANAGE],
  INVENTORY_MANAGER: [P.INVENTORY_READ, P.INVENTORY_MANAGE],
  ACCOUNTANT: [P.FINANCIAL_READ, P.FINANCIAL_MANAGE, P.REPORTS_READ],
  STAFF: [P.ORDERS_READ],
});

/** Default permission bundle for a role (a copy, safe to store on a membership). */
export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
