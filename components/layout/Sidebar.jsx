"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Boxes, Brush, Building2, ChefHat, Globe, Inbox, ScrollText, Circle, LayoutDashboard, LayoutGrid, Palette, PanelLeftClose, PanelLeftOpen,
  ReceiptText, Settings, ShoppingCart, UtensilsCrossed, Wallet, X,
} from "lucide-react";
import { getVisibleNav } from "@/config/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveMembership } from "@/store/slices/tenantSlice";
import {
  closeMobile, selectSidebarCollapsed, selectSidebarMobileOpen, toggleCollapsed,
} from "@/store/slices/sidebarSlice";
import { cn } from "@/lib/utils/cn";

const ICONS = { Settings, Brush, Globe, Building2, Inbox, ScrollText, LayoutDashboard, Palette, UtensilsCrossed, ReceiptText, ShoppingCart, LayoutGrid, ChefHat, Boxes, Wallet };

export default function Sidebar({ groups: groupsProp, title = "Restaurant OS", homeHref = "/dashboard" }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const mobileOpen = useAppSelector(selectSidebarMobileOpen);
  const activeMembership = useAppSelector(selectActiveMembership);
  const groups = (groupsProp ?? getVisibleNav())
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || activeMembership?.permissions.includes(i.permission)) }))
    .filter((g) => g.items.length > 0);

  // Close the mobile drawer after navigation and on Escape.
  useEffect(() => {
    dispatch(closeMobile());
  }, [pathname, dispatch]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && dispatch(closeMobile());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, dispatch]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => dispatch(closeMobile())}
        />
      ) : null}

      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-w)] flex-col border-r border-border bg-surface",
          "transition-[transform,width,visibility] duration-200",
          mobileOpen ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
          collapsed && "lg:w-[var(--sidebar-w-collapsed)]",
        )}
      >
        <div className="flex h-[var(--header-h)] items-center justify-between border-b border-border px-4">
          <Link href={homeHref} className="flex items-center gap-2 font-display font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">R</span>
            <span className={cn(collapsed && "lg:sr-only")}>{title}</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted lg:hidden"
            onClick={() => dispatch(closeMobile())}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.id}>
              <p className={cn("px-3 pb-2 text-xs font-medium text-muted-foreground", collapsed && "lg:sr-only")}>
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Circle;
                  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-border p-3 lg:block">
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => dispatch(toggleCollapsed())}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            <span className={cn(collapsed && "sr-only")}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}
