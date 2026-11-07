import { ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/config/pos";
import { formatDateTime } from "@/lib/utils/format";
import { formatMoney, bpToInput } from "@/lib/utils/money";

/**
 * Printable receipt. Everything shown comes from the stored order snapshot (names and prices at
 * the time of sale), so later menu edits never change a receipt. Wrap it in an element with the
 * `print-area` class to print only the receipt (see globals.css).
 */
export default function Receipt({ order, tenantName, settings }) {
  const money = (m) => formatMoney(m, order.currency);
  const t = order.totals;
  return (
    <div className="mx-auto w-full max-w-sm bg-white p-4 font-mono text-[13px] text-black" aria-label={`Receipt for order ${order.orderNumber}`}>
      <div className="text-center">
        <p className="text-base font-bold">{tenantName}</p>
        {settings.taxRegistration ? <p>{settings.taxLabel} reg: {settings.taxRegistration}</p> : null}
        <p>Order #{order.orderNumber}</p>
        <p>{formatDateTime(order.createdAt)}</p>
        <p>{ORDER_TYPE_LABELS[order.type] ?? order.type}{order.tableLabel ? ` · ${order.tableLabel}` : ""}</p>
        {order.customer?.name ? <p>{order.customer.name}</p> : null}
      </div>

      <hr className="my-2 border-dashed border-black" />
      <ul className="space-y-1.5">
        {order.lines.map((l) => (
          <li key={l.lineId}>
            <div className="flex justify-between gap-2">
              <span>{l.quantity} x {l.name}{l.variantName ? ` (${l.variantName})` : ""}</span>
              <span className="tabular">{money(l.lineTotalMinor)}</span>
            </div>
            {l.modifiers.map((m) => (
              <p key={m.groupId} className="pl-4 text-[12px]">+ {m.options.map((o) => o.name).join(", ")}</p>
            ))}
            {l.note ? <p className="pl-4 text-[12px]">Note: {l.note}</p> : null}
          </li>
        ))}
      </ul>

      <hr className="my-2 border-dashed border-black" />
      <dl className="space-y-0.5">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular">{money(t.subtotalMinor)}</dd></div>
        {t.discountMinor > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd className="tabular">-{money(t.discountMinor)}</dd></div> : null}
        {t.serviceChargeMinor > 0 ? <div className="flex justify-between"><dt>Service charge ({bpToInput(order.serviceBp)}%)</dt><dd className="tabular">{money(t.serviceChargeMinor)}</dd></div> : null}
        {t.taxMinor > 0 ? <div className="flex justify-between"><dt>{settings.taxLabel} ({bpToInput(order.taxBp)}%)</dt><dd className="tabular">{money(t.taxMinor)}</dd></div> : null}
        <div className="flex justify-between border-t border-black pt-1 text-base font-bold"><dt>TOTAL</dt><dd className="tabular">{money(t.totalMinor)}</dd></div>
      </dl>

      {order.payments.length > 0 ? (
        <>
          <hr className="my-2 border-dashed border-black" />
          <ul className="space-y-0.5">
            {order.payments.map((p) => (
              <li key={p.txnId} className="flex justify-between">
                <span>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                <span className="tabular">{money(p.amountMinor)}</span>
              </li>
            ))}
            {order.payments.some((p) => p.changeMinor > 0) ? (
              <li className="flex justify-between"><span>Change</span><span className="tabular">{money(order.payments.reduce((s, p) => s + p.changeMinor, 0))}</span></li>
            ) : null}
          </ul>
        </>
      ) : null}
      {order.refundedMinor > 0 ? <p className="mt-1 flex justify-between"><span>Refunded</span><span className="tabular">-{money(order.refundedMinor)}</span></p> : null}
      <p className="mt-2 text-center">{order.status === "PAID" ? "PAID" : order.status === "CANCELLED" ? "CANCELLED" : order.status.replace(/_/g, " ")}</p>
      {order.payments.some((p) => p.method !== "CASH") ? <p className="text-center text-[11px]">Card and wallet payments in this system are demo payments.</p> : null}
      {settings.receiptFooter ? <p className="mt-3 whitespace-pre-line text-center">{settings.receiptFooter}</p> : null}
    </div>
  );
}
