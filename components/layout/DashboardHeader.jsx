"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { openMobile } from "@/store/slices/sidebarSlice";
import ThemeToggle from "./ThemeToggle";

function toLabel(segment) {
  return segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function DashboardHeader() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    href: `/${segments.slice(0, i + 1).join("/")}`,
    current: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-20 flex h-[var(--header-h)] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        className="flex size-10 items-center justify-center rounded-md hover:bg-muted lg:hidden"
        onClick={() => dispatch(openMobile())}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-sm">
          {crumbs.map((c) => (
            <li key={c.href} className="flex items-center gap-2 truncate">
              {c.current ? (
                <span aria-current="page" className="font-medium">{c.label}</span>
              ) : (
                <>
                  <Link href={c.href} className="text-muted-foreground hover:text-foreground">{c.label}</Link>
                  <span aria-hidden="true" className="text-muted-foreground">/</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <ThemeToggle />
    </header>
  );
}
