import { createHash } from "node:crypto";
import { AUDIT_ACTIONS } from "@/config/platform";
import { FULFILMENT_TRANSITIONS, POS_LIMITS } from "@/config/pos";
import { PlatformError } from "@/lib/platform/errors";
import { priceOrder, readPosSettings } from "./pricing";

/**
 * Trusted server-side order lifecycle. Callers MUST first verify the caller's permission with
 * requireTenantPermission(...) and validate input with schemas/pos.schema.js.
 *
 * Money rules enforced here:
 *  - prices come from the database menu (tenant-scoped), never from the client;
 *  - every create/pay/refund carries a client-generated UUID used as an idempotency key, so a
 *    retry or double-tap returns the original result and never creates a second order or payment;
 *  - payments and refunds are written as immutable ledger entries (tenants/{id}/transactions);
 *    corrections are new refund entries, never edits;
 *  - each operation is ONE transaction, so an order and its ledger can never disagree.
 */

const orderRef = (db, t, id) => db.doc(`tenants/${t}/orders/${id}`);
const txnRef = (db, t, id) => db.doc(`tenants/${t}/transactions/${id}`);

async function loadActiveTenant(tx, ref) {
  const snap = await tx.get(ref);
  if (!snap.exists) throw new PlatformError("TENANT_NOT_FOUND", 404);
  const tenant = snap.data();
  if (tenant.status !== "ACTIVE") throw new PlatformError("TENANT_NOT_ACTIVE", 403);
  return tenant;
}

async function loadOrder(tx, db, tenantId, orderId) {
  const snap = await tx.get(orderRef(db, tenantId, orderId));
  if (!snap.exists) throw new PlatformError("ORDER_NOT_FOUND", 404);
  return snap.data();
}

function audit(db, tx, { tenantId, actorUid, action, orderId, details, serverTimestamp }) {
  tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
    tenantId, action, actorUid, details: { orderId, ...details }, createdAt: serverTimestamp,
  });
}

export const hashRequest = (input) => createHash("sha256").update(JSON.stringify(input)).digest("hex");

// --------------------------------------------------------------------- create
export async function placeOrder(db, { tenantId, actorUid, orderId, input, canDiscount, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const requestHash = hashRequest(input);

  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);

    const existingSnap = await tx.get(orderRef(db, tenantId, orderId));
    if (existingSnap.exists) {
      const existing = existingSnap.data();
      if (existing.requestHash !== requestHash) throw new PlatformError("IDEMPOTENCY_CONFLICT", 409);
      return { orderId, orderNumber: existing.orderNumber, totalMinor: existing.totals.totalMinor, alreadyExists: true };
    }

    if (input.discount && !canDiscount) throw new PlatformError("DISCOUNT_NOT_ALLOWED", 403);

    // Prices come from THIS tenant's menu only.
    const ids = [...new Set(input.lines.map((l) => l.productId))];
    const snaps = await Promise.all(ids.map((id) => tx.get(db.doc(`tenants/${tenantId}/products/${id}`))));
    const products = new Map(snaps.filter((s) => s.exists).map((s) => [s.id, { id: s.id, ...s.data() }]));

    const settings = readPosSettings(tenant.settings);
    const { lines, totals } = priceOrder({ lines: input.lines, products, settings, discount: input.discount });

    const posMeta = { orderCounter: 0, ...(tenant.posMeta ?? {}) };
    const orderNumber = posMeta.orderCounter + 1;
    tx.update(tenantRef, { posMeta: { ...posMeta, orderCounter: orderNumber }, updatedAt: serverTimestamp });

    tx.set(orderRef(db, tenantId, orderId), {
      tenantId, orderNumber,
      type: input.type, tableLabel: input.tableLabel, customer: input.customer, note: input.note,
      lines,
      discount: input.discount ? { ...input.discount, amountMinor: totals.discountMinor } : null,
      totals, currency: settings.currency, taxBp: settings.taxBp, serviceBp: settings.serviceBp,
      status: "OPEN", paymentStatus: "UNPAID", paidMinor: 0, refundedMinor: 0, payments: [], refunds: [],
      fulfilmentStatus: "NEW",
      createdBy: actorUid, createdAt: serverTimestamp, updatedAt: serverTimestamp,
      requestHash,
    });
    audit(db, tx, { tenantId, actorUid, action: AUDIT_ACTIONS.ORDER_CREATED, orderId, details: { orderNumber, totalMinor: totals.totalMinor }, serverTimestamp });
    return { orderId, orderNumber, totalMinor: totals.totalMinor, alreadyExists: false };
  });
}

// -------------------------------------------------------------------- payment
export async function payOrder(db, { tenantId, actorUid, orderId, paymentRequestId, payments, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);

  return db.runTransaction(async (tx) => {
    await loadActiveTenant(tx, tenantRef);
    const order = await loadOrder(tx, db, tenantId, orderId);

    // Idempotency: the first ledger entry of a request has a deterministic id.
    const firstTxn = await tx.get(txnRef(db, tenantId, `${paymentRequestId}-0`));
    if (firstTxn.exists) {
      if (firstTxn.data().orderId !== orderId) throw new PlatformError("IDEMPOTENCY_CONFLICT", 409);
      return { status: order.status, paidMinor: order.paidMinor, totalMinor: order.totals.totalMinor, alreadyProcessed: true };
    }

    if (order.status !== "OPEN") throw new PlatformError("ORDER_NOT_PAYABLE", 409);
    if (order.payments.length + payments.length > POS_LIMITS.MAX_PAYMENTS_PER_ORDER) throw new PlatformError("TOO_MANY_PAYMENTS", 409);

    const balance = order.totals.totalMinor - order.paidMinor;
    const entries = payments.map((p, i) => {
      if (p.method === "CASH") {
        const tendered = p.tenderedMinor ?? p.amountMinor;
        if (tendered < p.amountMinor) throw new PlatformError("INSUFFICIENT_TENDER", 400);
        return { ...p, tenderedMinor: tendered, changeMinor: tendered - p.amountMinor, index: i };
      }
      if (p.tenderedMinor !== undefined && p.tenderedMinor !== p.amountMinor) throw new PlatformError("INVALID_PAYMENT", 400);
      return { ...p, tenderedMinor: p.amountMinor, changeMinor: 0, index: i };
    });
    const amount = entries.reduce((sum, p) => sum + p.amountMinor, 0);
    if (amount > balance) throw new PlatformError("OVERPAYMENT", 409);

    const summaries = [];
    for (const p of entries) {
      const id = `${paymentRequestId}-${p.index}`;
      tx.set(txnRef(db, tenantId, id), {
        tenantId, orderId, orderNumber: order.orderNumber, type: "PAYMENT", method: p.method, demo: p.method !== "CASH",
        amountMinor: p.amountMinor, tenderedMinor: p.tenderedMinor, changeMinor: p.changeMinor, reference: p.reference ?? "",
        paymentRequestId, createdBy: actorUid, createdAt: serverTimestamp,
      });
      summaries.push({ txnId: id, method: p.method, amountMinor: p.amountMinor, tenderedMinor: p.tenderedMinor, changeMinor: p.changeMinor });
    }

    const paidMinor = order.paidMinor + amount;
    const fullyPaid = paidMinor === order.totals.totalMinor;
    tx.update(orderRef(db, tenantId, orderId), {
      paidMinor,
      paymentStatus: fullyPaid ? "PAID" : "PARTIAL",
      status: fullyPaid ? "PAID" : "OPEN",
      payments: [...order.payments, ...summaries],
      ...(fullyPaid ? { paidAt: serverTimestamp } : {}),
      updatedAt: serverTimestamp,
    });
    audit(db, tx, { tenantId, actorUid, action: AUDIT_ACTIONS.ORDER_PAID, orderId, details: { amountMinor: amount, fullyPaid }, serverTimestamp });
    return { status: fullyPaid ? "PAID" : "OPEN", paidMinor, totalMinor: order.totals.totalMinor, changeMinor: entries.reduce((s, p) => s + p.changeMinor, 0), alreadyProcessed: false };
  });
}

// --------------------------------------------------------------------- cancel
export async function cancelOrder(db, { tenantId, actorUid, orderId, reason, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    await loadActiveTenant(tx, tenantRef);
    const order = await loadOrder(tx, db, tenantId, orderId);
    if (order.status === "CANCELLED") return { alreadyCancelled: true };
    if (order.status !== "OPEN" || order.paidMinor > 0) throw new PlatformError("ORDER_NOT_CANCELLABLE", 409); // paid orders are refunded, not cancelled

    tx.update(orderRef(db, tenantId, orderId), {
      status: "CANCELLED", fulfilmentStatus: "CANCELLED", cancelReason: reason, cancelledBy: actorUid, cancelledAt: serverTimestamp, updatedAt: serverTimestamp,
    });
    audit(db, tx, { tenantId, actorUid, action: AUDIT_ACTIONS.ORDER_CANCELLED, orderId, details: { reason }, serverTimestamp });
    return { alreadyCancelled: false };
  });
}

// --------------------------------------------------------------------- refund
export async function refundOrder(db, { tenantId, actorUid, orderId, refundRequestId, amountMinor, method, reason, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    await loadActiveTenant(tx, tenantRef);
    const order = await loadOrder(tx, db, tenantId, orderId);

    const existing = await tx.get(txnRef(db, tenantId, refundRequestId));
    if (existing.exists) {
      if (existing.data().orderId !== orderId) throw new PlatformError("IDEMPOTENCY_CONFLICT", 409);
      return { status: order.status, refundedMinor: order.refundedMinor, alreadyProcessed: true };
    }

    if (order.status === "CANCELLED") throw new PlatformError("ORDER_NOT_REFUNDABLE", 409);
    const refundable = order.paidMinor - order.refundedMinor;
    if (refundable <= 0) throw new PlatformError("ORDER_NOT_REFUNDABLE", 409);
    if (amountMinor > refundable) throw new PlatformError("REFUND_EXCEEDS_PAID", 409);
    if (order.refunds.length >= POS_LIMITS.MAX_PAYMENTS_PER_ORDER) throw new PlatformError("TOO_MANY_PAYMENTS", 409);

    tx.set(txnRef(db, tenantId, refundRequestId), {
      tenantId, orderId, orderNumber: order.orderNumber, type: "REFUND", method, demo: method !== "CASH",
      amountMinor, reason, paymentRequestId: refundRequestId, createdBy: actorUid, createdAt: serverTimestamp,
    });
    const refundedMinor = order.refundedMinor + amountMinor;
    const fullyRefunded = refundedMinor === order.paidMinor;
    const wasSettled = order.status !== "OPEN"; // OPEN orders with partial payments stay open
    tx.update(orderRef(db, tenantId, orderId), {
      refundedMinor,
      paymentStatus: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
      ...(wasSettled ? { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" } : {}),
      refunds: [...order.refunds, { txnId: refundRequestId, method, amountMinor, reason }],
      updatedAt: serverTimestamp,
    });
    audit(db, tx, { tenantId, actorUid, action: AUDIT_ACTIONS.ORDER_REFUNDED, orderId, details: { amountMinor, reason }, serverTimestamp });
    return { status: wasSettled ? (fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED") : order.status, refundedMinor, alreadyProcessed: false };
  });
}

// ------------------------------------------------------------------ fulfilment
export async function updateFulfilment(db, { tenantId, actorUid, orderId, status, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    await loadActiveTenant(tx, tenantRef);
    const order = await loadOrder(tx, db, tenantId, orderId);
    if (order.fulfilmentStatus === status) return { status, unchanged: true };
    if (!(FULFILMENT_TRANSITIONS[order.fulfilmentStatus] ?? []).includes(status)) throw new PlatformError("INVALID_TRANSITION", 409);
    tx.update(orderRef(db, tenantId, orderId), { fulfilmentStatus: status, updatedAt: serverTimestamp });
    audit(db, tx, { tenantId, actorUid, action: AUDIT_ACTIONS.ORDER_FULFILMENT_UPDATED, orderId, details: { from: order.fulfilmentStatus, to: status }, serverTimestamp });
    return { status, unchanged: false };
  });
}

// ------------------------------------------------------------------- settings
/** Saves POS/business settings after server-side validation (clients can no longer write `settings`). */
export async function saveSettings(db, { tenantId, actorUid, settings, serverTimestamp }) {
  const tenantRef = db.doc(`tenants/${tenantId}`);
  return db.runTransaction(async (tx) => {
    const tenant = await loadActiveTenant(tx, tenantRef);
    tx.update(tenantRef, { settings: { ...(tenant.settings ?? {}), ...settings }, updatedAt: serverTimestamp });
    tx.set(db.collection(`tenants/${tenantId}/auditLogs`).doc(), {
      tenantId, action: AUDIT_ACTIONS.SETTINGS_UPDATED, actorUid, details: {}, createdAt: serverTimestamp,
    });
    return { saved: true };
  });
}

/** Totals implied by a ledger: used by tests and reconciliation reports to prove orders and ledger agree. */
export function summarizeLedger(entries) {
  let paid = 0;
  let refunded = 0;
  for (const e of entries) {
    if (e.type === "PAYMENT") paid += e.amountMinor;
    else if (e.type === "REFUND") refunded += e.amountMinor;
  }
  return { paidMinor: paid, refundedMinor: refunded, netMinor: paid - refunded };
}
