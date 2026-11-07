"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireAnyTenantPermission, requireTenantPermission } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { cancelOrder, refundOrder, updateFulfilment } from "@/lib/pos/orders";
import { POS_MESSAGES } from "@/lib/pos/messages";
import { toActionFailure } from "@/lib/utils/action-result";
import { cancelOrderSchema, fulfilmentSchema, refundOrderSchema } from "@/schemas/pos.schema";

/** Order management actions. Each checks its own permission in the caller's verified workspace. */

export async function cancelOrderAction(input) {
  const { session, access } = await requireTenantPermission("ORDERS_UPDATE");
  try {
    const data = cancelOrderSchema.parse(input);
    const result = await cancelOrder(getAdminDb(), { tenantId: access.tenantId, actorUid: session.user.uid, ...data, serverTimestamp: FieldValue.serverTimestamp() });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, POS_MESSAGES);
  }
}

/** Refunds need their own permission (ORDERS_REFUND): owners and managers by default, never cashiers. */
export async function refundOrderAction(input) {
  const { session, access } = await requireTenantPermission("ORDERS_REFUND");
  try {
    const data = refundOrderSchema.parse(input);
    const result = await refundOrder(getAdminDb(), { tenantId: access.tenantId, actorUid: session.user.uid, ...data, serverTimestamp: FieldValue.serverTimestamp() });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, POS_MESSAGES);
  }
}

export async function updateFulfilmentAction(input) {
  const { session, access } = await requireAnyTenantPermission(["ORDERS_UPDATE", "KITCHEN_UPDATE"]);
  try {
    const data = fulfilmentSchema.parse(input);
    const result = await updateFulfilment(getAdminDb(), { tenantId: access.tenantId, actorUid: session.user.uid, ...data, serverTimestamp: FieldValue.serverTimestamp() });
    return { ok: true, ...result };
  } catch (error) {
    return toActionFailure(error, POS_MESSAGES);
  }
}
