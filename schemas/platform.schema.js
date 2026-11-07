import { z } from "zod";
import { REASON_MAX, REASON_MIN } from "@/config/platform";

const docId = z.string().regex(/^[A-Za-z0-9]{20}$/, "Invalid id");
const requiredReason = z.string().trim().min(REASON_MIN, `Give a reason (at least ${REASON_MIN} characters)`).max(REASON_MAX);
const optionalReason = z.string().trim().max(REASON_MAX).optional();

export const approveApplicationSchema = z.object({ applicationId: docId });
export const rejectApplicationSchema = z.object({ applicationId: docId, reason: requiredReason });
export const suspendTenantSchema = z.object({ tenantId: docId, reason: requiredReason });
export const reactivateTenantSchema = z.object({ tenantId: docId, reason: optionalReason });
