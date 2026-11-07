"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { payOrder, placeOrder } from "@/lib/pos/orders";
import { POS_MESSAGES } from "@/lib/pos/messages";
import { toActionFailure } from "@/lib/utils/action-result";
import { toSerializable } from "@/lib/utils/serialize";
import { payOrderSchema, placeOrderSchema } from "@/schemas/pos.schema";

/**
 * POS Server Actions. The caller's tenant and permissions come from the verified session, never
 * from the browser. The browser sends product ids and quantities only: prices, tax, service charge
 * and totals are computed here from the database menu. Every call carries a UUID idempotency key.
 */

export async function placeOrderAction(input) {
  const { session, access } = await requireTenantPermission("POS_CREATE");
  try {
    const { clientOrderId, order } = placeOrderSchema.parse(input);
    const result = await placeOrder(getAdminDb(), {
      tenantId: access.tenantId,
      actorUid: session.user.uid,
      orderId: clientOrderId,
      input: order,
      canDiscount: access.permissions.includes("POS_DISCOUNT"),
      serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, POS_MESSAGES);
  }
}

export async function payOrderAction(input) {
  const { session, access } = await requireTenantPermission("POS_CREATE");
  try {
    const data = payOrderSchema.parse(input);
    const db = getAdminDb();
    const result = await payOrder(db, {
      tenantId: access.tenantId,
      actorUid: session.user.uid,
      orderId: data.orderId,
      paymentRequestId: data.paymentRequestId,
      payments: data.payments,
      serverTimestamp: FieldValue.serverTimestamp(),
    });
    // Return the settled order so the screen can print a receipt (internal fields removed).
    const snap = await db.doc(`tenants/${access.tenantId}/orders/${data.orderId}`).get();
    const { requestHash, ...order } = snap.data();
    return { ok: true, ...result, order: toSerializable({ id: data.orderId, ...order }) };
  } catch (error) {
    return toActionFailure(error, POS_MESSAGES);
  }
}
