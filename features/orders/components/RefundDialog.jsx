"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/config/pos";
import { formatMoney, minorToInput, parseMoneyInput } from "@/lib/utils/money";
import { refundOrderAction } from "@/app/dashboard/orders/actions";

/** Refund against a paid order. The idempotency key lives for the lifetime of this dialog, so a retry cannot refund twice. */
export default function RefundDialog({ order, onClose, onDone }) {
  const refundable = order.paidMinor - order.refundedMinor;
  const [refundRequestId] = useState(() => globalThis.crypto.randomUUID());
  const [amount, setAmount] = useState(minorToInput(refundable));
  const [method, setMethod] = useState(order.payments[0]?.method ?? "CASH");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const amountMinor = parseMoneyInput(amount);
    if (amountMinor === null || amountMinor <= 0) return setError("Enter an amount like 250.00.");
    if (amountMinor > refundable) return setError(`You can refund at most ${formatMoney(refundable, order.currency)}.`);
    if (reason.trim().length < 5) return setError("Give a reason (at least 5 characters).");
    setBusy(true);
    setError(null);
    const result = await refundOrderAction({ orderId: order.id, refundRequestId, amountMinor, method, reason });
    setBusy(false);
    if (result.ok) onDone();
    else setError(result.error);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent title={`Refund · Order #${order.orderNumber}`} description={`Up to ${formatMoney(refundable, order.currency)} can be refunded. Card and wallet refunds are demo entries.`}>
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
        <div className="space-y-3">
          <div>
            <label htmlFor="rf-amount" className="text-sm font-medium">Amount ({order.currency})</label>
            <Input id="rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label htmlFor="rf-method" className="text-sm font-medium">Refund method</label>
            <select id="rf-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rf-reason" className="text-sm font-medium">Reason</label>
            <Textarea id="rf-reason" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}Refund</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
