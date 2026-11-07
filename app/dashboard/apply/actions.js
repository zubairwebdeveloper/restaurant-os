"use server";

import { FieldValue } from "firebase-admin/firestore";
import { requireSession } from "@/lib/auth/dal";
import { getAdminDb } from "@/lib/firebase/admin";
import { submitApplication } from "@/lib/onboarding/applications";
import { toActionFailure } from "@/lib/utils/action-result";
import { tenantApplicationInputSchema } from "@/schemas/tenant.schema";

const MESSAGES = {
  APPLICATION_ALREADY_PENDING: "You already have an application waiting for review.",
  TOO_MANY_APPLICATIONS: "You have reached the maximum number of applications. Contact support.",
};

/** Owner submits a restaurant application. Owner id comes from the verified session, never from input. */
export async function submitApplicationAction(input) {
  const session = await requireSession(); // requires a verified email; may redirect
  try {
    const data = tenantApplicationInputSchema.parse(input);
    const { applicationId } = await submitApplication(getAdminDb(), {
      ownerUid: session.user.uid,
      input: data,
      serverTimestamp: FieldValue.serverTimestamp(),
    });
    return { ok: true, applicationId };
  } catch (error) {
    return toActionFailure(error, MESSAGES);
  }
}
