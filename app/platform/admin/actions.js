"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireSession } from "@/lib/auth/dal";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { AuthorizationError } from "@/lib/security/tenant-access";
import { requirePlatformAdmin } from "@/lib/security/authorization";
import { PlatformError } from "@/lib/platform/errors";
import { approveApplication, changeTenantStatus, rejectApplication } from "@/lib/platform/tenant-lifecycle";
import {
  approveApplicationSchema, reactivateTenantSchema, rejectApplicationSchema, suspendTenantSchema,
} from "@/schemas/platform.schema";

/**
 * Platform mutations (Server Actions). Each action:
 *  1. requires a valid session (redirects otherwise),
 *  2. re-verifies an ACTIVE SUPER_ADMIN in Firestore (support staff are read-only),
 *  3. validates input with Zod,
 *  4. runs the transactional lifecycle function.
 * Next.js also rejects cross-origin Server Action requests.
 */

const MESSAGES = {
  APPLICATION_NOT_FOUND: "That application no longer exists.",
  APPLICATION_NOT_PENDING: "That application has already been reviewed.",
  OWNER_NOT_FOUND: "The applicant's account could not be found.",
  OWNER_EMAIL_NOT_VERIFIED: "The applicant has not verified their email yet.",
  TENANT_NOT_FOUND: "That restaurant no longer exists.",
  INVALID_TRANSITION: "That change is not allowed for the restaurant's current status.",
  REASON_REQUIRED: "A reason is required.",
};

function failure(error) {
  if (error instanceof AuthorizationError) return { ok: false, error: "You do not have permission to do this." };
  if (error instanceof PlatformError) return { ok: false, error: MESSAGES[error.code] ?? "Request could not be completed." };
  if (error?.name === "ZodError") return { ok: false, error: error.issues?.[0]?.message ?? "Invalid input." };
  console.error("Platform action failed:", error?.code ?? error?.message);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function run(schema, input, work) {
  const session = await requireSession(); // may redirect; deliberately outside try/catch
  try {
    await requirePlatformAdmin(getAdminDb(), session.user.uid, ["SUPER_ADMIN"]);
    const data = schema.parse(input);
    const result = await work(data, { adminUid: session.user.uid, serverTimestamp: FieldValue.serverTimestamp() });
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function approveApplicationAction(input) {
  return run(approveApplicationSchema, input, async ({ applicationId }, ctx) => {
    const { tenantId } = await approveApplication(getAdminDb(), getAdminAuth(), { applicationId, ...ctx });
    return { tenantId };
  });
}

export async function rejectApplicationAction(input) {
  return run(rejectApplicationSchema, input, async ({ applicationId, reason }, ctx) => {
    await rejectApplication(getAdminDb(), { applicationId, reason, ...ctx });
    return {};
  });
}

export async function suspendTenantAction(input) {
  return run(suspendTenantSchema, input, async ({ tenantId, reason }, ctx) => {
    await changeTenantStatus(getAdminDb(), { tenantId, action: "SUSPEND", reason, ...ctx });
    return {};
  });
}

export async function reactivateTenantAction(input) {
  return run(reactivateTenantSchema, input, async ({ tenantId, reason }, ctx) => {
    await changeTenantStatus(getAdminDb(), { tenantId, action: "REACTIVATE", reason, ...ctx });
    return {};
  });
}
