"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToOrderButton } from "@/features/menu/add-to-order-button";
import { useCartStore, selectCartTotal } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils/format";

export function OrderBoard({ items }) {
  const lines = useCartStore((s) => s.lines);
  const total = useCartStore(selectCartTotal);
  const { setQty, remove, clear } = useCartStore();
  const [mode, setMode] = useState("takeaway");

  return (
    <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
      <div>
        <h2 className="text-3xl sm:text-4xl">Add to your basket</h2>
        <ul className="mt-6 divide-y divide-ivory/10 border-y border-ivory/10">
          {items
            .filter((i) => i.available)
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-heading text-xl text-ivory">{item.name}</p>
                  <p className="text-sm text-gold">{formatPrice(item.price)}</p>
                </div>
                <AddToOrderButton item={item} />
              </li>
            ))}
        </ul>
      </div>

      <aside
        className="h-fit rounded-md border border-gold/30 bg-charcoal/50 p-6 sm:p-8 lg:sticky lg:top-28"
        aria-label="Your basket"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl">Your basket</h2>
          {lines.length > 0 ? (
            <button
              onClick={clear}
              className="text-xs text-ivory/60 underline-offset-4 hover:text-gold hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <Tabs value={mode} onValueChange={setMode} className="mt-4">
          <TabsList aria-label="Order type">
            <TabsTrigger value="takeaway">Takeaway</TabsTrigger>
            <TabsTrigger value="dinein">Dine in</TabsTrigger>
          </TabsList>
        </Tabs>

        {lines.length === 0 ? (
          <div className="py-12 text-center text-ivory/60">
            <ShoppingBag className="mx-auto size-8 text-gold/70" />
            <p className="mt-4">Your basket is empty. Add a dish to begin.</p>
            <Button variant="link" className="mt-2">
              <Link href="/menu">Browse the menu</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-ivory/10">
            {lines.map((l) => (
              <li key={l.id} className="py-4">
                <div className="flex justify-between gap-3">
                  <p className="text-ivory">{l.name}</p>
                  <p className="text-sand">{formatPrice(l.price * l.qty)}</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => setQty(l.id, l.qty - 1)}
                    aria-label={`Remove one ${l.name}`}
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm" aria-live="polite">
                    {l.qty}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => setQty(l.id, l.qty + 1)}
                    aria-label={`Add one ${l.name}`}
                  >
                    <Plus />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto size-8"
                    onClick={() => remove(l.id)}
                    aria-label={`Remove ${l.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 ? (
          <div className="mt-4 border-t border-gold/30 pt-5">
            <div className="flex justify-between font-heading text-2xl">
              <span>Estimated total</span>
              <span className="text-gold">{formatPrice(total)}</span>
            </div>
            <Button size="lg" className="mt-5 w-full" disabled>
              Checkout opens soon
            </Button>
            <p className="mt-3 text-xs text-ivory/55">
              Online checkout is being connected. Prices are confirmed by the
              restaurant when you order.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
