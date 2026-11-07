"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, POS_LIMITS } from "@/config/pos";
import { buildPayments, splitEqually } from "@/lib/pos/payment-form";
import { formatMoney, minorToInput } from "@/lib/utils/money";
import { payOrderAction } from "@/app/dashboard/pos/actions";

const newRow = (amount = "") => ({ key: globalThis.crypto.randomUUID(), method: "CASH", amount, tendered: "" });

/**
 * Takes payment for an order, with split payments. Card and wallet are DEMO modes only.
 * The idempotency key (paymentRequestId) is created once and reused for retries, so a double-tap
 * or a retry after a network error can never charge twice; it only changes after a successful partial payment.
 * Remount with a new `key` per order.
 */
export default function PaymentDialog({ target, currency, onClose, onPaid }) {
  const [paid, setPaid] = useState(target.paidMinor ?? 0);
  const balance = target.totalMinor - paid;
  const [rows, setRows] = useState(() => [newRow(minorToInput(target.totalMinor - (target.paidMinor ?? 0)))]);
  const [requestId, setRequestId] = useState(() => globalThis.crypto.randomUUID());
  const [splitCount, setSplitCount] = useState("2");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const built = buildPayments(rows, balance);
  const money = (m) => formatMoney(m, currency);
  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function split() {
    const parts = splitEqually(balance, Number(splitCount) || 2);
    setRows(parts.map((p) => newRow(minorToInput(p))));
  }

  async function submit() {
    if (!built.ok) return setError(built.error);
    setBusy(true);
    setError(null);
    const result = await payOrderAction({ orderId: target.orderId, paymentRequestId: requestId, payments: built.payments });
    setBusy(false);
    if (!result.ok) return setError(result.error); // same requestId is kept: a retry cannot double-charge
    if (result.status === "PAID") return onPaid(result.order);
    toast.success("Partial payment recorded.");
    setPaid(result.paidMinor);
    setRequestId(globalThis.crypto.randomUUID());
    setRows([newRow(minorToInput(result.totalMinor - result.paidMinor))]);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent title={`Take payment · Order #${target.orderNumber}`} description="Card and mobile wallet are demo payments: no money moves.">
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Total</p><p className="tabular font-semibold">{money(target.totalMinor)}</p></div>
          <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Paid</p><p className="tabular font-semibold">{money(paid)}</p></div>
          <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Due</p><p className="tabular font-semibold">{money(balance)}</p></div>
        </div>

        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <label htmlFor={`m-${row.key}`} className="text-xs font-medium">Method</label>
                <select id={`m-${row.key}`} value={row.method} onChange={(e) => update(row.key, { method: e.target.value, tendered: "" })} className="h-11 w-full rounded-md border border-border bg-surface px-2 text-sm">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`a-${row.key}`} className="text-xs font-medium">Amount</label>
                <Input id={`a-${row.key}`} inputMode="decimal" value={row.amount} onChange={(e) => update(row.key, { amount: e.target.value })} />
              </div>
              {row.method === "CASH" ? (
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor={`t-${row.key}`} className="text-xs font-medium">Cash received</label>
                  <Input id={`t-${row.key}`} inputMode="decimal" value={row.tendered} placeholder="Optional" onChange={(e) => update(row.key, { tendered: e.target.value })} />
                </div>
              ) : <div className="hidden sm:block" />}
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove payment ${i + 1}`} onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))} disabled={rows.length <= 1}><Trash2 aria-hidden="true" /></Button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, newRow("")])} disabled={rows.length >= POS_LIMITS.MAX_PAYMENTS_PER_REQUEST}><Plus aria-hidden="true" />Add payment</Button>
          <div className="ml-auto flex items-end gap-2">
            <div>
              <label htmlFor="split-count" className="text-xs font-medium">Split equally between</label>
              <Input id="split-count" inputMode="numeric" value={splitCount} onChange={(e) => setSplitCount(e.target.value)} className="h-9 w-20" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={split}>Split</Button>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border p-3 text-sm" aria-live="polite">
          {built.ok ? (
            <>
              <p className="flex justify-between"><span>This payment</span><span className="tabular font-medium">{money(built.totalMinor)}</span></p>
              <p className="flex justify-between"><span>Remaining after</span><span className="tabular font-medium">{money(balance - built.totalMinor)}</span></p>
              {built.changeMinor > 0 ? <p className="flex justify-between"><span>Change to give</span><span className="tabular font-semibold">{money(built.changeMinor)}</span></p> : null}
            </>
          ) : <p className="text-muted-foreground">{built.error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          <Button type="button" size="lg" onClick={submit} disabled={busy || !built.ok}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {built.ok && built.totalMinor === balance ? "Pay in full" : "Record payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
