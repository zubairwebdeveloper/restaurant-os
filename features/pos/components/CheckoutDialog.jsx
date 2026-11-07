"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ORDER_TYPES, ORDER_TYPE_LABELS } from "@/config/pos";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCart, setCustomer, setDiscount, setNote, setOrderType, setTableLabel } from "@/store/slices/cartSlice";
import { formatMoney } from "@/lib/utils/money";

function Row({ label, value, strong }) {
  return (
    <div className={strong ? "flex justify-between border-t border-border pt-2 text-base font-semibold" : "flex justify-between text-sm"}>
      <dt>{label}</dt><dd className="tabular">{value}</dd>
    </div>
  );
}

export default function CheckoutDialog({ estimate, currency, settings, canDiscount, busy, error, onPlace, onClose }) {
  const dispatch = useAppDispatch();
  const cart = useAppSelector(selectCart);
  const money = (m) => formatMoney(m, currency);
  const t = estimate.totals;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent title="Review order" description="Final prices are calculated and confirmed by the server when you place the order.">
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}

        <fieldset>
          <legend className="text-sm font-medium">Order type</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ORDER_TYPES.map((type) => (
              <label key={type} className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-border px-2 text-center text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
                <input type="radio" name="order-type" className="sr-only" checked={cart.orderType === type} onChange={() => dispatch(setOrderType(type))} />
                {ORDER_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 space-y-3">
          {cart.orderType === "DINE_IN" ? (
            <div>
              <label htmlFor="co-table" className="text-sm font-medium">Table</label>
              <Input id="co-table" maxLength={20} value={cart.tableLabel} onChange={(e) => dispatch(setTableLabel(e.target.value))} placeholder="For example T5" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-name" className="text-sm font-medium">Customer name{cart.orderType === "DELIVERY" ? "" : " (optional)"}</label>
                  <Input id="co-name" maxLength={80} value={cart.customer.name} onChange={(e) => dispatch(setCustomer({ name: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="co-phone" className="text-sm font-medium">Phone{cart.orderType === "DELIVERY" ? "" : " (optional)"}</label>
                  <Input id="co-phone" type="tel" value={cart.customer.phone} onChange={(e) => dispatch(setCustomer({ phone: e.target.value }))} />
                </div>
              </div>
              {cart.orderType === "DELIVERY" ? (
                <div>
                  <label htmlFor="co-address" className="text-sm font-medium">Delivery address</label>
                  <Textarea id="co-address" rows={2} maxLength={200} value={cart.customer.address} onChange={(e) => dispatch(setCustomer({ address: e.target.value }))} />
                </div>
              ) : null}
            </>
          )}

          {canDiscount ? (
            <fieldset className="rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">Discount</legend>
              <div className="grid grid-cols-[8rem_1fr] gap-2">
                <div>
                  <label htmlFor="co-dtype" className="sr-only">Discount type</label>
                  <select id="co-dtype" value={cart.discount.type} onChange={(e) => dispatch(setDiscount({ type: e.target.value }))} className="h-11 w-full rounded-md border border-border bg-surface px-2 text-sm">
                    <option value="NONE">None</option>
                    <option value="PERCENT">Percent %</option>
                    <option value="FIXED">Amount</option>
                  </select>
                </div>
                {cart.discount.type !== "NONE" ? (
                  <div>
                    <label htmlFor="co-dvalue" className="sr-only">Discount value</label>
                    <Input id="co-dvalue" inputMode="decimal" value={cart.discount.value} onChange={(e) => dispatch(setDiscount({ value: e.target.value }))} placeholder={cart.discount.type === "PERCENT" ? "10" : "250.00"} />
                  </div>
                ) : null}
              </div>
              {cart.discount.type !== "NONE" ? (
                <div className="mt-2">
                  <label htmlFor="co-dreason" className="text-xs font-medium">Reason (recorded on the order)</label>
                  <Input id="co-dreason" maxLength={120} value={cart.discount.reason} onChange={(e) => dispatch(setDiscount({ reason: e.target.value }))} />
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <div>
            <label htmlFor="co-note" className="text-sm font-medium">Order note (optional)</label>
            <Input id="co-note" maxLength={200} value={cart.note} onChange={(e) => dispatch(setNote(e.target.value))} />
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 rounded-md bg-muted p-3">
          <Row label="Subtotal" value={money(t.subtotalMinor)} />
          {t.discountMinor > 0 ? <Row label="Discount" value={`-${money(t.discountMinor)}`} /> : null}
          {t.serviceChargeMinor > 0 ? <Row label="Service charge" value={money(t.serviceChargeMinor)} /> : null}
          {t.taxMinor > 0 ? <Row label={settings.taxLabel} value={money(t.taxMinor)} /> : null}
          <Row label="Total" value={money(t.totalMinor)} strong />
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={() => onPlace(false)} disabled={busy}>Send order, pay later</Button>
          <Button type="button" size="lg" onClick={() => onPlace(true)} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Place and take payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
