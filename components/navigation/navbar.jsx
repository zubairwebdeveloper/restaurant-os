"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, ShoppingBag, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { useCartStore, selectCartCount } from "@/store/cart-store";
import { cn } from "@/lib/utils/cn";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { mobileNavOpen, toggleMobileNav, closeMobileNav } = useUiStore();
  const count = useCartStore(selectCartCount);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-gold/20 bg-forest/85 py-3 backdrop-blur-md"
          : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="font-heading text-2xl tracking-wide text-ivory"
          aria-label="Green Lagoon Hotel, home"
        >
          Green Lagoon
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {siteConfig.nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-1 text-sm text-ivory/75 transition-colors hover:text-ivory",
                  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 hover:after:scale-x-100",
                  active && "text-ivory after:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Link href="/order" aria-label={`Order basket, ${count} items`}>
              <ShoppingBag />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-gold text-[11px] font-semibold text-forest">
                  {count}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button size="sm" className="hidden sm:inline-flex">
            <Link href="/reservation">Reserve a table</Link>
          </Button>

          <Dialog.Root
            open={mobileNavOpen}
            onOpenChange={(o) => (o ? toggleMobileNav() : closeMobileNav())}
          >
            <Dialog.Trigger>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col border-l border-gold/25 bg-forest p-8 shadow-lift">
                <Dialog.Title className="sr-only">Site navigation</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Links to the main pages of Green Lagoon Hotel
                </Dialog.Description>
                <Dialog.Close>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label="Close menu"
                  >
                    <X />
                  </Button>
                </Dialog.Close>
                <nav aria-label="Mobile" className="mt-6 flex flex-col">
                  {[{ label: "Home", href: "/" }, ...siteConfig.nav].map(
                    (item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileNav}
                        className="border-b border-ivory/10 py-4 font-heading text-3xl text-ivory transition-colors hover:text-gold"
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </nav>
                <Button size="lg" className="mt-auto">
                  <Link href="/reservation" onClick={closeMobileNav}>
                    Reserve a table
                  </Link>
                </Button>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
