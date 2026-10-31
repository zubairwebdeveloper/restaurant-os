/**
 * Dashboard navigation. Items appear only when their phase has shipped,
 * so the sidebar never links to pages that do not exist yet.
 * Permissions per item are added in Phase 3 (role-based access).
 */
export const CURRENT_PHASE = 1;

export const NAV_GROUPS = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", phase: 1, exact: true },
      { href: "/dashboard/design-system", label: "Design system", icon: "Palette", phase: 1 },
      { href: "/dashboard/menu", label: "Menu", icon: "UtensilsCrossed", phase: 6 },
      { href: "/dashboard/orders", label: "Orders", icon: "ReceiptText", phase: 7 },
      { href: "/dashboard/pos", label: "POS", icon: "ShoppingCart", phase: 7 },
      { href: "/dashboard/tables", label: "Tables", icon: "LayoutGrid", phase: 8 },
      { href: "/dashboard/kitchen", label: "Kitchen", icon: "ChefHat", phase: 9 },
      { href: "/dashboard/inventory", label: "Inventory", icon: "Boxes", phase: 11 },
      { href: "/dashboard/finance", label: "Finance", icon: "Wallet", phase: 12 },
    ],
  },
];

export function getVisibleNav(phase = CURRENT_PHASE) {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.phase <= phase) })).filter(
    (g) => g.items.length > 0,
  );
}
