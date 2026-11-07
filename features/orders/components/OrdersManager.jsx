"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ReasonDialog from "@/components/shared/ReasonDialog";
import PaymentDialog from "@/features/pos/components/PaymentDialog";
import Receipt from "@/features/pos/components/Receipt";
import { FULFILMENT_TRANSITIONS, ORDER_TYPES, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/config/pos";
import { filterOrders, orderBadge } from "@/lib/pos/filters";
import { formatDateTime } from "@/lib/utils/format";
import { formatMoney } from "@/lib/utils/money";
import { cancelOrderAction, updateFulfilmentAction } from "@/app/dashboard/orders/actions";
import RefundDialog from "./RefundDialog";

const STATUS_OPTIONS = [["ALL", "All statuses"], ["OPEN", "Open"], ["PAID", "Paid"], ["PARTIALLY_REFUNDED", "Partly refunded"], ["REFUNDED", "Refunded"], ["CANCELLED", "Cancelled"]];
const FULFILMENT_LABEL = { NEW: "New", PREPARING: "Preparing", READY: "Ready", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const MARK_LABEL = { PREPARING: "Mark preparing", READY: "Mark ready", COMPLETED: "Mark completed" };

export default function OrdersManager({ orders, settings, tenantName, can }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState(null); // "pay" | "cancel" | "refund"
  const [showReceipt, setShowReceipt] = useState(false);

  const refresh = () => startTransition(() => router.refresh());
  const filtered = filterOrders(orders, { status, type, search });
  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const money = (o, m) => formatMoney(m, o.currency);

  const columns = [
    { id: "number", header: "Order", sortable: true, accessor: (o) => o.orderNumber, cell: (o) => <span className="tabular font-medium">#{o.orderNumber}</span> },
    { id: "time", header: "Placed", sortable: true, accessor: (o) => o.createdAt, cell: (o) => <span className="tabular whitespace-nowrap">{formatDateTime(o.createdAt)}</span> },
    { id: "type", header: "Type", sortable: true, accessor: (o) => o.type, cell: (o) => (<div><p>{ORDER_TYPE_LABELS[o.type]}</p>{o.tableLabel ? <p className="text-xs text-muted-foreground">{o.tableLabel}</p> : null}</div>) },
    { id: "customer", header: "Customer", accessor: (o) => o.customer?.name, cell: (o) => o.customer?.name || "-" },
    { id: "total", header: "Total", sortable: true, accessor: (o) => o.totals.totalMinor, className: "text-right", cell: (o) => <span className="tabular">{money(o, o.totals.totalMinor)}</span> },
    { id: "status", header: "Status", sortable: true, accessor: (o) => o.status, cell: (o) => (<div className="space-y-1"><StatusBadge {...orderBadge(o)} /><p className="text-xs text-muted-foreground">Kitchen: {FULFILMENT_LABEL[o.fulfilmentStatus] ?? o.fulfilmentStatus}</p></div>) },
    { id: "actions", header: <span className="sr-only">Actions</span>, accessor: () => null, cell: (o) => <Button size="sm" variant="outline" onClick={() => { setShowReceipt(false); setSelectedId(o.id); }} aria-label={`View order ${o.orderNumber}`}>View</Button> },
  ];

  async function cancel(reason) {
    const result = await cancelOrderAction({ orderId: selected.id, reason });
    if (result.ok) { toast.success(`Order #${selected.orderNumber} cancelled.`); refresh(); }
    return result;
  }

  async function advance(next) {
    const result = await updateFulfilmentAction({ orderId: selected.id, status: next });
    if (result.ok) refresh();
    else toast.error(result.error);
  }

  const balance = selected ? selected.totals.totalMinor - selected.paidMinor : 0;
  const refundable = selected ? selected.paidMinor - selected.refundedMinor : 0;
  const nextSteps = selected ? FULFILMENT_TRANSITIONS[selected.fulfilmentStatus] ?? [] : [];

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label htmlFor="orders-search" className="sr-only">Search orders</label>
          <Input id="orders-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number, table, customer or phone" />
        </div>
        <div>
          <label htmlFor="orders-status" className="sr-only">Status</label>
          <select id="orders-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="orders-type" className="sr-only">Order type</label>
          <select id="orders-type" value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
            <option value="ALL">All types</option>
            {ORDER_TYPES.map((t) => <option key={t} value={t}>{ORDER_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      <DataTable
        caption="Orders" columns={columns} rows={filtered} getRowId={(o) => o.id} initialSort={{ id: "number", direction: "desc" }}
        emptyState={<EmptyState icon={ReceiptText} title={orders.length === 0 ? "No orders yet" : "No orders match"} description={orders.length === 0 ? "Orders placed at the POS appear here." : "Try a different search or filter."} />}
      />
      <p className="mt-2 text-xs text-muted-foreground">Showing the latest 200 orders.</p>

      {selected ? (
        <Dialog open onOpenChange={(open) => !open && setSelectedId(null)}>
          <DialogContent title={`Order #${selected.orderNumber}`} description={`${ORDER_TYPE_LABELS[selected.type]}${selected.tableLabel ? ` · ${selected.tableLabel}` : ""} · ${formatDateTime(selected.createdAt)}`} className="max-w-xl">
            {showReceipt ? (
              <div>
                <div className="print-area"><Receipt order={selected} tenantName={tenantName} settings={settings} /></div>
                <div className="mt-4 flex justify-end gap-2 print:hidden">
                  <Button variant="outline" onClick={() => setShowReceipt(false)}>Back to details</Button>
                  <Button onClick={() => window.print()}><Printer aria-hidden="true" />Print receipt</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge {...orderBadge(selected)} />
                  <span className="text-sm text-muted-foreground">Kitchen: {FULFILMENT_LABEL[selected.fulfilmentStatus]}</span>
                </div>

                <ul className="divide-y divide-border rounded-md border border-border">
                  {selected.lines.map((l) => (
                    <li key={l.lineId} className="flex justify-between gap-3 p-3 text-sm">
                      <div>
                        <p className="font-medium">{l.quantity} x {l.name}{l.variantName ? ` (${l.variantName})` : ""}</p>
                        {l.modifiers.map((m) => <p key={m.groupId} className="text-xs text-muted-foreground">+ {m.options.map((o) => o.name).join(", ")}</p>)}
                        {l.note ? <p className="text-xs text-muted-foreground">Note: {l.note}</p> : null}
                      </div>
                      <span className="tabular shrink-0">{money(selected, l.lineTotalMinor)}</span>
                    </li>
                  ))}
                </ul>

                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular">{money(selected, selected.totals.subtotalMinor)}</dd></div>
                  {selected.totals.discountMinor > 0 ? <div className="flex justify-between"><dt>Discount{selected.discount?.reason ? ` (${selected.discount.reason})` : ""}</dt><dd className="tabular">-{money(selected, selected.totals.discountMinor)}</dd></div> : null}
                  {selected.totals.serviceChargeMinor > 0 ? <div className="flex justify-between"><dt>Service charge</dt><dd className="tabular">{money(selected, selected.totals.serviceChargeMinor)}</dd></div> : null}
                  {selected.totals.taxMinor > 0 ? <div className="flex justify-between"><dt>{settings.taxLabel}</dt><dd className="tabular">{money(selected, selected.totals.taxMinor)}</dd></div> : null}
                  <div className="flex justify-between border-t border-border pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular">{money(selected, selected.totals.totalMinor)}</dd></div>
                  <div className="flex justify-between"><dt>Paid</dt><dd className="tabular">{money(selected, selected.paidMinor)}</dd></div>
                  {selected.refundedMinor > 0 ? <div className="flex justify-between"><dt>Refunded</dt><dd className="tabular">-{money(selected, selected.refundedMinor)}</dd></div> : null}
                  {selected.status === "OPEN" ? <div className="flex justify-between font-medium"><dt>Balance due</dt><dd className="tabular">{money(selected, balance)}</dd></div> : null}
                </dl>

                {selected.payments.length > 0 || selected.refunds.length > 0 ? (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">Payments</h3>
                    <ul className="space-y-1 text-sm">
                      {selected.payments.map((p) => <li key={p.txnId} className="flex justify-between"><span>{PAYMENT_METHOD_LABELS[p.method]}</span><span className="tabular">{money(selected, p.amountMinor)}</span></li>)}
                      {selected.refunds.map((r) => <li key={r.txnId} className="flex justify-between text-muted-foreground"><span>Refund ({PAYMENT_METHOD_LABELS[r.method]}): {r.reason}</span><span className="tabular">-{money(selected, r.amountMinor)}</span></li>)}
                    </ul>
                  </div>
                ) : null}
                {selected.status === "CANCELLED" && selected.cancelReason ? <p className="text-sm">Cancelled: {selected.cancelReason}</p> : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {can.takePayment && selected.status === "OPEN" && balance > 0 ? <Button onClick={() => setDialog("pay")}>Take payment</Button> : null}
                  {can.fulfil && selected.status !== "CANCELLED" ? nextSteps.map((s) => <Button key={s} variant="outline" onClick={() => advance(s)}>{MARK_LABEL[s]}</Button>) : null}
                  {can.cancel && selected.status === "OPEN" && selected.paidMinor === 0 ? <Button variant="outline" onClick={() => setDialog("cancel")}>Cancel order</Button> : null}
                  {can.refund && refundable > 0 && selected.status !== "CANCELLED" ? <Button variant="outline" onClick={() => setDialog("refund")}>Refund</Button> : null}
                  <Button variant="ghost" className="ml-auto" onClick={() => setShowReceipt(true)}><ReceiptText aria-hidden="true" />Receipt</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      ) : null}

      {selected && dialog === "pay" ? (
        <PaymentDialog
          key={selected.id} currency={selected.currency}
          target={{ orderId: selected.id, orderNumber: selected.orderNumber, totalMinor: selected.totals.totalMinor, paidMinor: selected.paidMinor }}
          onClose={() => { setDialog(null); refresh(); }}
          onPaid={() => { setDialog(null); toast.success(`Order #${selected.orderNumber} paid.`); refresh(); setShowReceipt(true); }}
        />
      ) : null}
      {selected && dialog === "refund" ? (
        <RefundDialog key={selected.id} order={selected} onClose={() => setDialog(null)} onDone={() => { setDialog(null); toast.success("Refund recorded."); refresh(); }} />
      ) : null}
      <ReasonDialog
        open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)}
        title={`Cancel order #${selected?.orderNumber ?? ""}?`} description="Only unpaid orders can be cancelled. The reason is kept on the order."
        confirmLabel="Cancel order" destructive onConfirm={cancel}
      />
    </div>
  );
}
