"use client";

import { useAppSelector } from "@/store/hooks";
import { selectSidebarCollapsed } from "@/store/slices/sidebarSlice";
import { cn } from "@/lib/utils/cn";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";

export default function DashboardShell({ children, navGroups, title, homeHref }) {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar groups={navGroups} title={title} homeHref={homeHref} />
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[var(--sidebar-w-collapsed)]" : "lg:pl-[var(--sidebar-w)]",
        )}
      >
        <DashboardHeader />
        <main id="main-content" className="mx-auto w-full max-w-[var(--container-max)] px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
