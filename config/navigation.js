/**
 * Dashboard navigation. Items appear only when their phase has shipped,
 * so the sidebar never links to pages that do not exist yet.
 * An item with a `permission` is shown only to members holding it (a UI hint; pages re-check on the server).
 */
export const CURRENT_PHASE = 7;

export const NAV_GROUPS = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", phase: 1, exact: true },
      { href: "/dashboard/design-system", label: "Design system", icon: "Palette", phase: 1 },
      { href: "/dashboard/branding", label: "Branding", icon: "Brush", phase: 5, permission: "SETTINGS_MANAGE" },
      { href: "/dashboard/website", label: "Website", icon: "Globe", phase: 5, permission: "SETTINGS_MANAGE" },
      { href: "/dashboard/menu", label: "Menu", icon: "UtensilsCrossed", phase: 6, permission: "MENU_MANAGE" },
      { href: "/dashboard/orders", label: "Orders", icon: "ReceiptText", phase: 7, permission: "ORDERS_READ" },
      { href: "/dashboard/pos", label: "POS", icon: "ShoppingCart", phase: 7, permission: "POS_CREATE" },
      { href: "/dashboard/tables", label: "Tables", icon: "LayoutGrid", phase: 8 },
      { href: "/dashboard/kitchen", label: "Kitchen", icon: "ChefHat", phase: 9 },
      { href: "/dashboard/inventory", label: "Inventory", icon: "Boxes", phase: 11 },
      { href: "/dashboard/settings", label: "Settings", icon: "Settings", phase: 7, permission: "SETTINGS_MANAGE" },
      { href: "/dashboard/finance", label: "Finance", icon: "Wallet", phase: 12 },
    ],
  },
];

/** Platform administration navigation (separate shell from the restaurant dashboard). */
export const PLATFORM_NAV_GROUPS = [
  {
    id: "platform",
    label: "Platform",
    items: [
      { href: "/platform/admin/dashboard", label: "Overview", icon: "LayoutDashboard", phase: 4 },
      { href: "/platform/admin/applications", label: "Applications", icon: "Inbox", phase: 4 },
      { href: "/platform/admin/tenants", label: "Restaurants", icon: "Building2", phase: 4 },
      { href: "/platform/admin/audit-logs", label: "Audit logs", icon: "ScrollText", phase: 4 },
    ],
  },
];

export function getVisibleNav(phase = CURRENT_PHASE, groups = NAV_GROUPS) {
  return groups.map((g) => ({ ...g, items: g.items.filter((i) => i.phase <= phase) })).filter(
    (g) => g.items.length > 0,
  );
}
