import { PAYMENT_METHODS, POS_LIMITS } from "@/config/pos";
import { parseMoneyInput } from "@/lib/utils/money";

/** Splits an amount into n parts that add up exactly; the first parts get the extra minor units. */
export function splitEqually(totalMinor, n) {
  const parts = Math.max(1, Math.min(POS_LIMITS.MAX_PAYMENTS_PER_REQUEST, Math.floor(n)));
  const base = Math.floor(totalMinor / parts);
  const extra = totalMinor - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Turns the payment dialog rows (typed text) into the payments the server expects.
 * rows: [{ method, amount, tendered }]. Returns { ok, payments, totalMinor, changeMinor, error }.
 * The server validates again; this only gives the cashier early, readable feedback.
 */
export function buildPayments(rows, balanceMinor) {
  if (rows.length === 0) return { ok: false, error: "Add a payment." };
  const payments = [];
  let change = 0;
  for (const [i, row] of rows.entries()) {
    const label = rows.length > 1 ? `Payment ${i + 1}: ` : "";
    if (!PAYMENT_METHODS.includes(row.method)) return { ok: false, error: `${label}Choose a payment method.` };
    const amount = parseMoneyInput(row.amount ?? "");
    if (amount === null || amount <= 0) return { ok: false, error: `${label}Enter an amount like 250.00.` };
    const payment = { method: row.method, amountMinor: amount };
    if (row.method === "CASH" && (row.tendered ?? "").trim() !== "") {
      const tendered = parseMoneyInput(row.tendered);
      if (tendered === null) return { ok: false, error: `${label}Enter the cash received like 300.00.` };
      if (tendered < amount) return { ok: false, error: `${label}Cash received is less than the amount.` };
      payment.tenderedMinor = tendered;
      change += tendered - amount;
    }
    payments.push(payment);
  }
  const totalMinor = payments.reduce((s, p) => s + p.amountMinor, 0);
  if (totalMinor > balanceMinor) return { ok: false, error: "The payments add up to more than the amount due." };
  return { ok: true, payments, totalMinor, changeMinor: change };
}
