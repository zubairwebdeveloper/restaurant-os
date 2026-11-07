"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Printer, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import EmptyState from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";
import { buildOrderInput, estimateCart } from "@/lib/pos/cart";
import { orderInputSchema } from "@/schemas/pos.schema";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { addLine, beginSubmission, clearCart, removeLine, selectCart, setQuantity } from "@/store/slices/cartSlice";
import { closePayment, openPayment, selectCategory, selectPaymentTarget, selectPosCategory, selectPosSearch, setSearch } from "@/store/slices/posSlice";
import { placeOrderAction } from "@/app/dashboard/pos/actions";
import CheckoutDialog from "./CheckoutDialog";
import ItemDialog from "./ItemDialog";
import PaymentDialog from "./PaymentDialog";
import Receipt from "./Receipt";

export default function PosTerminal({ tenantName, settings, canDiscount, categories, products }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const cart = useAppSelector(selectCart);
  const categoryId = useAppSelector(selectPosCategory);
  const search = useAppSelector(selectPosSearch);
  const paymentTarget = useAppSelector(selectPaymentTarget);

  const [itemProduct, setItemProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const currency = settings.currency;
  const money = (m) => formatMoney(m, currency);
  const activeCategory = categories.some((c) => c.id === categoryId) ? categoryId : "all";
  const needle = search.trim().toLowerCase();
  const visible = products.filter((p) => (activeCategory === "all" || p.categoryId === activeCategory) && (!needle || p.name.toLowerCase().includes(needle)));
  const estimate = estimateCart(cart, products, settings);
  const count = cart.lines.reduce((n, l) => n + l.quantity, 0);

  function pick(product) {
    if (product.available === false) return;
    const simple = (product.variants ?? []).length === 0 && (product.modifierGroups ?? []).length === 0;
    if (simple) dispatch(addLine({ productId: product.id, name: product.name, unitPriceMinor: product.priceMinor }));
    else setItemProduct(product);
  }

  async function place(payNow) {
    const parsed = orderInputSchema.safeParse(buildOrderInput(cart));
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the order details.");
    if (!estimate.ok) return setError("Something in this order is no longer available. Remove it and try again.");
    if (cart.discount.type !== "NONE" && cart.discount.reason.trim().length < 3) return setError("Give a reason for the discount.");

    setBusy(true);
    setError(null);
    dispatch(beginSubmission()); // the key is reused if this attempt fails and is retried unchanged
    const result = await placeOrderAction({ clientOrderId: store.getState().cart.clientOrderId, order: parsed.data });
    setBusy(false);
    if (!result.ok) return setError(result.error);

    dispatch(clearCart());
    setCheckoutOpen(false);
    if (payNow) dispatch(openPayment({ orderId: result.orderId, orderNumber: result.orderNumber, totalMinor: result.totalMinor }));
    else toast.success(`Order #${result.orderNumber} placed. Take payment later from Orders.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-label="Menu" className="min-w-0">
        <div className="relative mb-3">
          <label htmlFor="pos-search" className="sr-only">Search the menu</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="pos-search" type="search" value={search} onChange={(e) => dispatch(setSearch(e.target.value))} placeholder="Search the menu" className="h-12 pl-9" />
        </div>

        <div role="tablist" aria-label="Categories" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button
              key={c.id} type="button" role="tab" aria-selected={activeCategory === c.id}
              onClick={() => dispatch(selectCategory(c.id))}
              className={cn("min-h-11 shrink-0 rounded-full border border-border px-4 text-sm font-medium", activeCategory === c.id ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-muted")}
            >
              {c.name}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={products.length === 0 ? "No menu items yet" : "Nothing found"} description={products.length === 0 ? "Add categories and products on the Menu page first." : "Try another search or category."} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => {
              const soldOut = p.available === false;
              return (
                <li key={p.id}>
                  <button
                    type="button" onClick={() => pick(p)} disabled={soldOut}
                    className="flex min-h-28 w-full flex-col justify-between rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:bg-muted active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="font-medium leading-tight">{p.name}</span>
                    <span className="tabular mt-2 text-sm text-muted-foreground">
                      {soldOut ? "Sold out" : `${(p.variants ?? []).length > 0 ? "from " : ""}${money((p.variants ?? []).length > 0 ? Math.min(...p.variants.map((v) => v.priceMinor)) : p.priceMinor)}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside id="cart" aria-label="Current order" className="self-start rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-20">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current order</h2>
          {cart.lines.length > 0 ? <Button variant="ghost" size="sm" onClick={() => dispatch(clearCart())}>Clear</Button> : null}
        </div>

        {cart.lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Tap an item to add it.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cart.lines.map((l) => (
              <li key={l.lineId} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{l.name}{l.variantName ? ` (${l.variantName})` : ""}</p>
                    {l.labels.length > 0 ? <p className="text-xs text-muted-foreground">+ {l.labels.join(", ")}</p> : null}
                    {l.note ? <p className="text-xs text-muted-foreground">Note: {l.note}</p> : null}
                  </div>
                  <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Remove ${l.name}`} onClick={() => dispatch(removeLine(l.lineId))}><Trash2 aria-hidden="true" /></Button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1" role="group" aria-label={`Quantity of ${l.name}`}>
                    <Button variant="outline" size="icon" className="size-9" aria-label={`Decrease ${l.name}`} onClick={() => dispatch(setQuantity({ lineId: l.lineId, quantity: l.quantity - 1 }))}><Minus aria-hidden="true" /></Button>
                    <span className="tabular w-8 text-center font-semibold">{l.quantity}</span>
                    <Button variant="outline" size="icon" className="size-9" aria-label={`Increase ${l.name}`} onClick={() => dispatch(setQuantity({ lineId: l.lineId, quantity: l.quantity + 1 }))}><Plus aria-hidden="true" /></Button>
                  </div>
                  <span className="tabular text-sm">{money(l.unitPriceMinor * l.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-border pt-3">
          <p className="flex justify-between text-base font-semibold"><span>Total (estimate)</span><span className="tabular">{estimate.ok ? money(estimate.totals.totalMinor) : "-"}</span></p>
          {!estimate.ok ? <p role="alert" className="mt-1 text-xs text-destructive">An item is unavailable or its options changed. Remove it and add it again.</p> : null}
          <Button size="lg" className="mt-3 w-full" disabled={cart.lines.length === 0 || !estimate.ok} onClick={() => { setError(null); setCheckoutOpen(true); }}>
            Review order ({count})
          </Button>
        </div>
      </aside>

      {itemProduct ? (
        <ItemDialog
          key={itemProduct.id} product={itemProduct} currency={currency}
          onClose={() => setItemProduct(null)}
          onAdd={(line) => { dispatch(addLine(line)); setItemProduct(null); }}
        />
      ) : null}

      {checkoutOpen ? (
        <CheckoutDialog estimate={estimate} currency={currency} settings={settings} canDiscount={canDiscount} busy={busy} error={error} onPlace={place} onClose={() => setCheckoutOpen(false)} />
      ) : null}

      {paymentTarget ? (
        <PaymentDialog
          key={paymentTarget.orderId} target={paymentTarget} currency={currency}
          onClose={() => dispatch(closePayment())}
          onPaid={(order) => { dispatch(closePayment()); setReceipt(order); }}
        />
      ) : null}

      {receipt ? (
        <Dialog open onOpenChange={(open) => !open && setReceipt(null)}>
          <DialogContent title={`Order #${receipt.orderNumber} paid`} description="Print the receipt or start a new order.">
            <div className="print-area"><Receipt order={receipt} tenantName={tenantName} settings={settings} /></div>
            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}><Printer aria-hidden="true" />Print receipt</Button>
              <Button onClick={() => setReceipt(null)}>New order</Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
